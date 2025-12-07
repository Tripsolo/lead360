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

// Background processing function for enrichment
async function processEnrichmentBatch(
  leadsToEnrich: LeadToEnrich[],
  projectId: string,
  mqlSchema: string,
  mqlApiKey: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`[Background] Starting enrichment batch for ${leadsToEnrich.length} leads`);
  console.log(`[Background] MQL Schema: "${mqlSchema}"`);

  for (const lead of leadsToEnrich) {
    try {
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      const payload = [{
        name: lead.name || "",
        phone: lead.phone || "",
        project_id: projectId,
      }];

      console.log(`[MQL Request] Lead ID: ${lead.id}`);
      console.log(`[MQL Request] Headers: { "x-schema": "${mqlSchema}", "authorization": "***", "Content-Type": "application/json" }`);
      console.log(`[MQL Request] Body: ${JSON.stringify(payload)}`);

      const mqlResponse = await fetch("https://api.dev.raisn.ai/api/lead/mql/batch/", {
        method: "POST",
        headers: {
          "x-schema": mqlSchema,
          "authorization": mqlApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(`[MQL Response] Status: ${mqlResponse.status} ${mqlResponse.statusText}`);
      console.log(`[MQL Response] Headers: ${JSON.stringify(Object.fromEntries(mqlResponse.headers.entries()))}`);

      const responseText = await mqlResponse.text();
      console.log(`[MQL Response] Body: ${responseText.substring(0, 1000)}`);

      if (!mqlResponse.ok) {
        console.error(`[MQL Error] Lead ${lead.id}: HTTP ${mqlResponse.status} - ${responseText}`);
        
        // Store failed enrichment with N/A rating
        await supabase.from("lead_enrichments").upsert({
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: "N/A",
          raw_response: { status: "FAILED", error: responseText, http_status: mqlResponse.status },
        }, { onConflict: "lead_id,project_id" });
        
        continue;
      }

      let mqlDataArray;
      try {
        mqlDataArray = JSON.parse(responseText);
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
      
      // Extract first lead from batch response array
      const mqlData = Array.isArray(mqlDataArray) ? mqlDataArray[0] : mqlDataArray;

      // Check if enrichment failed or returned N/A
      const status = mqlData.status || "SUCCESS";
      const rating = mqlData.mql_rating || mqlData.rating || null;
      
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
        console.error(`[DB Error] Failed to store enrichment for lead ${lead.id}:`, upsertError);
        continue;
      }

      console.log(`[Success] Enriched lead ${lead.id} with rating: ${enrichmentData.mql_rating}`);
    } catch (error) {
      console.error(`[Error] Exception enriching lead ${lead.id}:`, error);
      
      // Store error in database
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

  console.log(`[Background] Enrichment batch complete`);
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

    // Step 2: Fetch brand info to get dynamic mql_schema
    console.log(`[enrich-leads] Fetching project and brand info for project: ${projectId}`);
    
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("brand_id")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      console.error("[enrich-leads] Failed to fetch project:", projectError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch project information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[enrich-leads] Project brand_id: ${projectData.brand_id}`);

    const { data: brandData, error: brandError } = await supabase
      .from("brands")
      .select("metadata")
      .eq("id", projectData.brand_id)
      .single();

    if (brandError) {
      console.error("[enrich-leads] Failed to fetch brand:", brandError);
    }

    // Extract mql_schema from brand metadata, fallback to brand_id
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

    // Start background processing
    console.log(`[enrich-leads] Starting background processing for ${leadsToEnrich.length} leads`);
    
    // Use EdgeRuntime.waitUntil for background processing if available
    const backgroundPromise = processEnrichmentBatch(
      leadsToEnrich,
      projectId,
      mqlSchema,
      mqlApiKey,
      supabaseUrl,
      supabaseKey
    );

    // Check if EdgeRuntime is available (Supabase Edge Functions)
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundPromise);
      
      // Return immediately with processing status
      return new Response(
        JSON.stringify({
          status: "processing",
          message: `Started enrichment for ${leadsToEnrich.length} leads. Results will be available shortly.`,
          meta: {
            total: leads.length,
            toEnrich: leadsToEnrich.length,
            cached: enrichedLeadIds.size,
            leadsToEnrichIds: leadsToEnrich.map((l: LeadToEnrich) => l.id),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // Fallback: wait for processing to complete (for local testing)
      console.log("[enrich-leads] EdgeRuntime not available, processing synchronously");
      await backgroundPromise;
      
      // Fetch all enrichments after processing
      const { data: allEnrichments } = await supabase
        .from("lead_enrichments")
        .select("*")
        .in("lead_id", leadIds)
        .eq("project_id", projectId);

      const successCount = allEnrichments?.filter(e => e.mql_rating !== "N/A").length || 0;
      const failedCount = allEnrichments?.filter(e => e.mql_rating === "N/A").length || 0;

      return new Response(
        JSON.stringify({
          results: leadIds.map((id: string) => ({ leadId: id, success: true })),
          enrichments: allEnrichments || [],
          meta: {
            total: leads.length,
            enriched: successCount,
            cached: enrichedLeadIds.size,
            failed: failedCount,
            failedLeadIds: allEnrichments?.filter(e => e.mql_rating === "N/A").map(e => e.lead_id) || [],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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

// Type declaration for EdgeRuntime
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;
