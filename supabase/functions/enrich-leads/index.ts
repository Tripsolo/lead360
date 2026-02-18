import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadToEnrich {
  id: string;
  name: string;
  phone?: string;
}

interface LoanDetail {
  loan_type?: string;
  sanction_date?: string;
  sanction_amount?: number;
  emi_amount?: number;
  current_balance?: number;
  is_guarantor?: boolean;
  status?: string;
}

interface BusinessDetail {
  gst_number?: string;
  business_name?: string;
  business_type?: string;
  industry?: string;
  turnover_slab?: string;
  hsn_codes?: string[];
}

// Parse turnover slab to get numeric range for comparison
function parseTurnoverToIncome(turnoverSlab: string): { minIncome: number; maxIncome: number } | null {
  const slabMap: Record<string, { minIncome: number; maxIncome: number }> = {
    "0-40L": { minIncome: 0, maxIncome: 8 },          // ~20% margin assumption
    "40L-1.5Cr": { minIncome: 8, maxIncome: 30 },     // ~20% margin assumption
    "1.5Cr-5Cr": { minIncome: 30, maxIncome: 75 },    // ~15% margin assumption
    "5Cr-25Cr": { minIncome: 50, maxIncome: 200 },    // ~8-10% margin assumption
    "25Cr+": { minIncome: 100, maxIncome: 500 },      // ~4-5% margin assumption
  };
  return slabMap[turnoverSlab] || null;
}

// Derive credit behavior signal from loan patterns
function deriveCreditBehaviorSignal(
  loans: LoanDetail[],
  activeLoans: number,
  creditScore: number | null
): string {
  const closedLoans = loans.filter(l => l.status === "closed" || l.status === "paid_off").length;
  const hasDefaults = loans.some(l => l.status === "default" || l.status === "npa");
  
  if (hasDefaults) {
    return "credit_risk";
  }
  
  if (activeLoans === 0 && closedLoans > 0 && creditScore && creditScore >= 750) {
    return "clean_credit";
  }
  
  if (activeLoans >= 3) {
    return "active_borrower";
  }
  
  if (activeLoans <= 1 && closedLoans === 0 && (!creditScore || creditScore < 700)) {
    return "conservative_borrower";
  }
  
  return "moderate_borrower";
}

// Background processing function for enrichment
async function processEnrichmentBatch(
  leadsToEnrich: LeadToEnrich[],
  projectId: string,
  projectName: string,
  mqlSchema: string,
  mqlApiKey: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`[Background] Starting enrichment batch for ${leadsToEnrich.length} leads`);
  console.log(`[Background] MQL Schema: "${mqlSchema}", Project Name for API: "${projectName}"`);

  for (let i = 0; i < leadsToEnrich.length; i++) {
    const lead = leadsToEnrich[i];
    try {
      // Add delay between requests to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const payload = [{
        name: lead.name || "",
        phone: lead.phone || "",
        project_id: projectName,
      }];

      console.log(`[MQL Request] Lead ID: ${lead.id}`);
      console.log(`[MQL Request] Headers: { "x-schema": "${mqlSchema}", "authorization": "***", "Content-Type": "application/json" }`);
      console.log(`[MQL Request] Body: ${JSON.stringify(payload)}`);

      // Add 140-second timeout to prevent edge function from hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 140000);

      let mqlResponse: Response;
      try {
        mqlResponse = await fetch("https://api.dev.raisn.ai/api/lead/mql/batch/", {
          method: "POST",
          headers: {
            "x-schema": mqlSchema,
            "authorization": mqlApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.log(`[MQL Timeout] Lead ${lead.id}: MQL API timed out after 140 seconds`);
          
          await supabase.from("lead_enrichments").upsert({
            lead_id: lead.id,
            project_id: projectId,
            enriched_at: new Date().toISOString(),
            mql_rating: "N/A",
            raw_response: { status: "TIMEOUT", error: "MQL API timeout after 140 seconds - retry later" },
          }, { onConflict: "lead_id,project_id" });
          
          continue;
        }
        
        throw fetchError;
      }

      console.log(`[MQL Response] Status: ${mqlResponse.status} ${mqlResponse.statusText}`);
      console.log(`[MQL Response] Headers: ${JSON.stringify(Object.fromEntries(mqlResponse.headers.entries()))}`);

      const responseText = await mqlResponse.text();
      console.log(`[MQL Response] Body: ${responseText.substring(0, 2000)}`);

      if (!mqlResponse.ok) {
        let parsedError;
        try {
          parsedError = JSON.parse(responseText);
        } catch {
          parsedError = null;
        }
        
        const leadData = parsedError?.leads?.[0];
        const isNoDataFound = leadData?.error === 'DATA_NOT_FOUND';
        
        if (isNoDataFound) {
          console.log(`[MQL] Lead ${lead.id}: No data found in MQL system (DATA_NOT_FOUND)`);
          
          await supabase.from("lead_enrichments").upsert({
            lead_id: lead.id,
            project_id: projectId,
            enriched_at: new Date().toISOString(),
            mql_rating: "N/A",
            raw_response: parsedError,
          }, { onConflict: "lead_id,project_id" });
        } else {
          console.error(`[MQL Error] Lead ${lead.id}: HTTP ${mqlResponse.status} - ${responseText}`);
          
          await supabase.from("lead_enrichments").upsert({
            lead_id: lead.id,
            project_id: projectId,
            enriched_at: new Date().toISOString(),
            mql_rating: "N/A",
            raw_response: { status: "FAILED", error: responseText, http_status: mqlResponse.status },
          }, { onConflict: "lead_id,project_id" });
        }
        
        continue;
      }

      let batchResponse;
      try {
        batchResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[MQL Error] Failed to parse JSON response for lead ${lead.id}:`, parseError);
        await supabase.from("lead_enrichments").upsert({
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: "N/A",
          raw_response: { status: "FAILED", error: "Invalid JSON response", raw: responseText.substring(0, 500) },
        }, { onConflict: "lead_id,project_id" });
        continue;
      }
      
      // MQL batch API returns: { leads: [{ person_info: {...}, demography: {...}, ... }] }
      const leadsArray = batchResponse.leads || [];
      const mqlData = leadsArray[0] || {};
      const personInfo = mqlData.person_info || {};
      const demography = mqlData.demography || {};
      const income = mqlData.income || {};
      const bankingSummary = mqlData.banking_summary || {};
      const bankingLoans = mqlData.banking_loans || [];
      const bankingCards = mqlData.banking_cards || [];
      const businessDetails = mqlData.business_details || {};

      // Check if enrichment failed
      const status = mqlData.status || "SUCCESS";
      const rating = personInfo.rating || null;
      
      if (status === "FAILED" || rating === "N/A") {
        console.log(`[MQL] Lead ${lead.id} enrichment returned N/A or FAILED`);
        
        await supabase.from("lead_enrichments").upsert({
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: "N/A",
          raw_response: mqlData,
        }, { onConflict: "lead_id,project_id" });
        
        continue;
      }

      // Parse loan details for enhanced analysis
      const loans: LoanDetail[] = Array.isArray(bankingLoans) ? bankingLoans : [];
      
      // Categorize loans
      const homeLoans = loans.filter(l => l.loan_type?.toLowerCase().includes("home") || l.loan_type?.toLowerCase().includes("housing"));
      const autoLoans = loans.filter(l => l.loan_type?.toLowerCase().includes("auto") || l.loan_type?.toLowerCase().includes("vehicle") || l.loan_type?.toLowerCase().includes("car"));
      const consumerLoans = loans.filter(l => l.loan_type?.toLowerCase().includes("personal") || l.loan_type?.toLowerCase().includes("consumer"));
      const guarantorLoans = loans.filter(l => l.is_guarantor === true);
      
      const activeHomeLoans = homeLoans.filter(l => l.status === "active" || !l.status).length;
      const paidOffHomeLoans = homeLoans.filter(l => l.status === "closed" || l.status === "paid_off").length;
      
      // Find latest home loan sanction date
      let latestHomeLoanDate: Date | null = null;
      for (const loan of homeLoans) {
        if (loan.sanction_date) {
          const loanDate = new Date(loan.sanction_date);
          if (!latestHomeLoanDate || loanDate > latestHomeLoanDate) {
            latestHomeLoanDate = loanDate;
          }
        }
      }
      
      // Calculate total active EMI burden
      const activeLoans = loans.filter(l => l.status === "active" || !l.status);
      const totalActiveEmi = activeLoans.reduce((sum, l) => sum + (l.emi_amount || 0), 0);
      
      // Calculate EMI to income ratio
      const monthlyIncome = (income.final_income_lacs || 0) * 100000 / 12;
      const emiToIncomeRatio = monthlyIncome > 0 ? (totalActiveEmi / monthlyIncome) * 100 : null;
      
      // Parse credit cards
      const cards = Array.isArray(bankingCards) ? bankingCards : [];
      const hasPremiumCards = cards.some((c: any) => 
        c.card_type?.toLowerCase().includes("amex") || 
        c.card_type?.toLowerCase().includes("platinum") ||
        c.card_type?.toLowerCase().includes("signature") ||
        c.card_type?.toLowerCase().includes("infinite")
      );
      const highestCardUsage = cards.reduce((max: number, c: any) => Math.max(max, c.usage_percent || 0), 0);
      
      // Parse business details
      const businessType = businessDetails.business_type || businessDetails.entity_type || null;
      const industry = businessDetails.industry || businessDetails.sector || null;
      const turnoverSlab = businessDetails.turnover_slab || businessDetails.turnover || null;
      
      // Derive credit behavior signal
      const creditBehaviorSignal = deriveCreditBehaviorSignal(
        loans,
        bankingSummary.active_loans || 0,
        mqlData.credit_score || null
      );

      // Extract employment details properly from employment_details array
      const employmentDetails = mqlData.employment_details || [];
      const primaryEmployment = employmentDetails[0] || {};
      
      // For salaried users, extract from employment_details array
      // Fallback to demography parsing only if employment_details is empty
      const employerName = primaryEmployment.employer_name || 
                           primaryEmployment.company_name || 
                           (demography.designation?.includes(', ') ? demography.designation.split(', ')[1] : null);
                           
      const designationValue = primaryEmployment.designation || 
                               primaryEmployment.role || 
                               (demography.designation?.includes(', ') ? demography.designation.split(', ')[0] : demography.designation) || 
                               null;
      
      // Extract employment status (salaried/self-employed/etc)
      const employmentStatus = primaryEmployment.employment_status || 
                               primaryEmployment.status || 
                               (demography.designation?.toLowerCase().includes('self-employed') ? 'self-employed' : 
                                demography.designation?.toLowerCase().includes('salaried') ? 'salaried' : null);

      // Extract data from MQL response using correct nested structure
      const enrichmentData = {
        lead_id: lead.id,
        project_id: projectId,
        enriched_at: new Date().toISOString(),
        mql_rating: rating,
        mql_capability: personInfo.capability || null,
        mql_lifestyle: personInfo.lifestyle || null,
        credit_score: mqlData.credit_score || null,
        age: personInfo.age || demography.age || null,
        gender: personInfo.gender || demography.gender || null,
        location: personInfo.location || demography.location || null,
        locality_grade: personInfo.locality_grade || null,
        lifestyle: personInfo.lifestyle || null,
        employer_name: employerName,
        designation: designationValue,
        final_income_lacs: income.final_income_lacs || null,
        pre_tax_income_lacs: income.pre_tax_income_lacs || income.pre_tax_income || null,
        total_loans: bankingSummary.total_loans || null,
        active_loans: bankingSummary.active_loans || null,
        home_loans: bankingSummary.home_loans || homeLoans.length || null,
        auto_loans: bankingSummary.auto_loans || autoLoans.length || null,
        highest_card_usage_percent: highestCardUsage || null,
        is_amex_holder: hasPremiumCards || null,
        // New enhanced fields
        business_type: businessType,
        industry: industry,
        turnover_slab: turnoverSlab,
        active_emi_burden: totalActiveEmi > 0 ? totalActiveEmi : null,
        emi_to_income_ratio: emiToIncomeRatio,
        home_loan_count: homeLoans.length || null,
        home_loan_active: activeHomeLoans || null,
        home_loan_paid_off: paidOffHomeLoans || null,
        auto_loan_count: autoLoans.length || null,
        consumer_loan_count: consumerLoans.length || null,
        guarantor_loan_count: guarantorLoans.length || null,
        credit_card_count: cards.length || null,
        has_premium_cards: hasPremiumCards,
        latest_home_loan_date: latestHomeLoanDate?.toISOString() || null,
        credit_behavior_signal: creditBehaviorSignal,
        raw_response: batchResponse,
      };

      // Upsert enrichment data
      const { error: upsertError } = await supabase
        .from("lead_enrichments")
        .upsert(enrichmentData, { onConflict: "lead_id,project_id" });

      if (upsertError) {
        console.error(`[DB Error] Failed to store enrichment for lead ${lead.id}:`, upsertError);
        continue;
      }

      console.log(`[Success] Enriched lead ${lead.id} with rating: ${enrichmentData.mql_rating}, business_type: ${businessType}, emi_ratio: ${emiToIncomeRatio?.toFixed(1)}%`);
    } catch (error) {
      console.error(`[Error] Exception enriching lead ${lead.id}:`, error);
      
      try {
        await supabase.from("lead_enrichments").upsert({
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: "N/A",
          raw_response: { status: "FAILED", error: String(error) },
        }, { onConflict: "lead_id,project_id" });
      } catch (dbError) {
        console.error(`[DB Error] Failed to store error for lead ${lead.id}:`, dbError);
      }
    }
  }

  console.log(`[Background] Enrichment batch complete: ${leadsToEnrich.length} leads processed`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, projectId } = await req.json();
    const mqlApiKey = Deno.env.get("MQL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log(`[enrich-leads] Received request for ${leads?.length || 0} leads, project: ${projectId}`);

    if (!mqlApiKey) {
      console.error("[enrich-leads] MQL_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "MQL API key not configured. Please add MQL_API_KEY to your secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch brand info to get dynamic mql_schema
    console.log(`[enrich-leads] Fetching project and brand info for project: ${projectId}`);
    
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("brand_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      console.error("[enrich-leads] Failed to fetch project:", projectError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch project information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[enrich-leads] Project brand_id: ${projectData.brand_id}, name: ${projectData.name}`);

    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("metadata")
      .eq("id", projectData.brand_id)
      .single();

    if (brandError) {
      console.error("[enrich-leads] Failed to fetch brand:", brandError);
    }

    const brandMetadata = brandData?.metadata as Record<string, any> | null;
    const mqlSchema = brandMetadata?.mql_schema || projectData.brand_id;
    
    console.log(`[enrich-leads] Using MQL schema: "${mqlSchema}" (from metadata: ${!!brandMetadata?.mql_schema})`);

    // Check for existing enrichments to avoid re-enriching
    const leadIds = leads.map((l: LeadToEnrich) => l.id);
    const { data: existingEnrichments } = await supabase
      .from("lead_enrichments")
      .select("lead_id, enriched_at")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    const enrichedLeadIds = new Set(existingEnrichments?.map(e => e.lead_id) || []);
    const leadsToEnrich = leads.filter((l: LeadToEnrich) => !enrichedLeadIds.has(l.id));

    console.log(`[enrich-leads] ${leadsToEnrich.length} leads need enrichment, ${enrichedLeadIds.size} already enriched`);

    // If no leads need enrichment, return cached results immediately
    if (leadsToEnrich.length === 0) {
      const { data: allEnrichments } = await supabase
        .from("lead_enrichments")
        .select("*")
        .in("lead_id", leadIds)
        .eq("project_id", projectId);

      return new Response(
        JSON.stringify({
          results: leadIds.map((id: string) => ({ leadId: id, success: true, fromCache: true })),
          enrichments: allEnrichments || [],
          meta: {
            total: leads.length,
            enriched: 0,
            cached: enrichedLeadIds.size,
            failed: 0,
            failedLeadIds: [],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process synchronously (1 lead per function call pattern)
    console.log(`[enrich-leads] Processing ${leadsToEnrich.length} lead(s) synchronously`);
    
    await processEnrichmentBatch(
      leadsToEnrich,
      projectId,
      projectData.name,
      mqlSchema,
      mqlApiKey,
      supabaseUrl,
      supabaseKey
    );
    
    // Fetch all enrichments after processing
    const { data: allEnrichments } = await supabase
      .from("lead_enrichments")
      .select("*")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    const successCount = allEnrichments?.filter(e => e.mql_rating && e.mql_rating !== "N/A").length || 0;
    const noDataCount = allEnrichments?.filter(e => e.mql_rating === "N/A").length || 0;

    console.log(`[enrich-leads] Complete: ${successCount} enriched, ${noDataCount} no data`);

    return new Response(
      JSON.stringify({
        status: "complete",
        results: leadIds.map((id: string) => ({ leadId: id, success: true })),
        enrichments: allEnrichments || [],
        meta: {
          total: leads.length,
          enriched: successCount,
          cached: enrichedLeadIds.size,
          noData: noDataCount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[enrich-leads] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
