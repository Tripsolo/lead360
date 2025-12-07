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

interface MqlApiResponse {
  id: string;
  status: string;
  mql_rating: string;
  mql_capability: string;
  mql_lifestyle: string;
  person_info: {
    credit_score: number;
    age: number;
    gender: string;
    location: string;
    locality_grade: string;
    lifestyle: string;
  };
  employment_details: {
    employer_name: string;
    designation: string;
  };
  income: {
    final_income_lacs: number;
  };
  banking_loans: {
    total_loans: number;
    active_loans: number;
    home_loans: number;
    auto_loans: number;
    sanction_date?: string;
  };
  banking_cards: {
    highest_usage_percent: number;
    is_amex_holder: boolean;
  };
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

    if (!mqlApiKey) {
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

    console.log(`Enriching ${leads.length} leads for project ${projectId}`);

    // Check for existing enrichments to avoid re-enriching
    const leadIds = leads.map((l: LeadToEnrich) => l.id);
    const { data: existingEnrichments } = await supabase
      .from("lead_enrichments")
      .select("lead_id, enriched_at")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    const enrichedLeadIds = new Set(existingEnrichments?.map(e => e.lead_id) || []);
    const leadsToEnrich = leads.filter((l: LeadToEnrich) => !enrichedLeadIds.has(l.id));

    console.log(`${leadsToEnrich.length} leads need enrichment, ${enrichedLeadIds.size} already enriched`);

    const enrichmentResults: any[] = [];
    const failedLeads: string[] = [];

    // Process leads that need enrichment
    for (const lead of leadsToEnrich) {
      try {
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

        // Call MQL Batch API (correct endpoint per docs)
        const mqlResponse = await fetch("https://api.dev.raisn.ai/api/lead/mql/batch/", {
          method: "POST",
          headers: {
            "x-schema": "Kalpataru",
            "authorization": mqlApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{
            name: lead.name || "",
            phone: lead.phone || "",
            project_id: projectId,
          }]),
        });

        if (!mqlResponse.ok) {
          const errorText = await mqlResponse.text();
          console.error(`MQL API error for lead ${lead.id}:`, errorText);
          failedLeads.push(lead.id);
          
          // Store failed enrichment with N/A rating
          await supabase.from("lead_enrichments").upsert({
            lead_id: lead.id,
            project_id: projectId,
            enriched_at: new Date().toISOString(),
            mql_rating: "N/A",
            raw_response: { status: "FAILED", error: errorText },
          }, { onConflict: "lead_id,project_id" });
          
          continue;
        }

        const mqlDataArray = await mqlResponse.json();
        console.log(`MQL raw response for lead ${lead.id}:`, JSON.stringify(mqlDataArray).substring(0, 500));
        
        // Extract first lead from batch response array
        const mqlData = Array.isArray(mqlDataArray) ? mqlDataArray[0] : mqlDataArray;

        // Check if enrichment failed or returned N/A
        const status = mqlData.status || "SUCCESS";
        const rating = mqlData.mql_rating || mqlData.rating || null;
        
        if (status === "FAILED" || rating === "N/A") {
          console.log(`Lead ${lead.id} enrichment returned N/A or FAILED`);
          failedLeads.push(lead.id);
          
          await supabase.from("lead_enrichments").upsert({
            lead_id: lead.id,
            project_id: projectId,
            enriched_at: new Date().toISOString(),
            mql_rating: "N/A",
            raw_response: mqlData,
          }, { onConflict: "lead_id,project_id" });
          
          continue;
        }

        // Extract data from response - handle various response structures
        const enrichmentData = {
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: mqlData.mql_rating || mqlData.rating || null,
          mql_capability: mqlData.mql_capability || mqlData.capability || null,
          mql_lifestyle: mqlData.mql_lifestyle || mqlData.person_info?.lifestyle || mqlData.lifestyle || null,
          credit_score: mqlData.person_info?.credit_score || mqlData.credit_score || null,
          age: mqlData.person_info?.age || mqlData.demography?.age || null,
          gender: mqlData.person_info?.gender || mqlData.demography?.gender || null,
          location: mqlData.person_info?.location || mqlData.demography?.location || null,
          locality_grade: mqlData.person_info?.locality_grade || mqlData.locality_grade || null,
          lifestyle: mqlData.person_info?.lifestyle || mqlData.lifestyle || null,
          employer_name: mqlData.employment_details?.employer_name || mqlData.employer_name || null,
          designation: mqlData.employment_details?.designation || mqlData.designation || null,
          final_income_lacs: mqlData.income?.final_income_lacs || mqlData.final_income_lacs || null,
          total_loans: mqlData.banking_loans?.total_loans || mqlData.total_loans || null,
          active_loans: mqlData.banking_loans?.active_loans || mqlData.active_loans || null,
          home_loans: mqlData.banking_loans?.home_loans || mqlData.home_loans || null,
          auto_loans: mqlData.banking_loans?.auto_loans || mqlData.auto_loans || null,
          highest_card_usage_percent: mqlData.banking_cards?.highest_usage_percent || mqlData.highest_card_usage_percent || null,
          is_amex_holder: mqlData.banking_cards?.is_amex_holder || mqlData.is_amex_holder || null,
          raw_response: mqlData,
        };

        // Upsert enrichment data
        const { error: upsertError } = await supabase
          .from("lead_enrichments")
          .upsert(enrichmentData, { onConflict: "lead_id,project_id" });

        if (upsertError) {
          console.error(`Failed to store enrichment for lead ${lead.id}:`, upsertError);
          failedLeads.push(lead.id);
          continue;
        }

        enrichmentResults.push({
          leadId: lead.id,
          success: true,
          data: enrichmentData,
        });

        console.log(`Successfully enriched lead ${lead.id}`);
      } catch (error) {
        console.error(`Error enriching lead ${lead.id}:`, error);
        failedLeads.push(lead.id);
      }
    }

    // Add already-enriched leads to results
    for (const leadId of enrichedLeadIds) {
      enrichmentResults.push({
        leadId,
        success: true,
        fromCache: true,
      });
    }

    // Fetch all enrichments for the leads (including cached ones)
    const { data: allEnrichments } = await supabase
      .from("lead_enrichments")
      .select("*")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    const enrichmentCount = enrichmentResults.filter(r => r.success && !r.fromCache).length;
    const cachedCount = enrichedLeadIds.size;

    console.log(`Enrichment complete: ${enrichmentCount} new, ${cachedCount} cached, ${failedLeads.length} failed`);

    return new Response(
      JSON.stringify({
        results: enrichmentResults,
        enrichments: allEnrichments || [],
        meta: {
          total: leads.length,
          enriched: enrichmentCount,
          cached: cachedCount,
          failed: failedLeads.length,
          failedLeadIds: failedLeads,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in enrich-leads function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
