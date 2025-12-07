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
  mql_rating: string;
  mql_capability: string;
  mql_lifestyle: string;
  person_info: {
    credit_score: number;
    age: number;
    gender: string;
    location: string;
  };
  employment_details: {
    employer_name: string;
    designation: string;
  };
  banking_loans: {
    total_loans: number;
    active_loans: number;
    home_loans: number;
    auto_loans: number;
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

        // Call MQL Batch API
        const mqlResponse = await fetch("https://api.enrichment.raisn.ai/api/v1/mql/batch", {
          method: "POST",
          headers: {
            "x-schema": "Kalpataru",
            "authorization": mqlApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: lead.name || "",
            phone: lead.phone || "",
            project_id: projectId,
          }),
        });

        if (!mqlResponse.ok) {
          const errorText = await mqlResponse.text();
          console.error(`MQL API error for lead ${lead.id}:`, errorText);
          failedLeads.push(lead.id);
          continue;
        }

        const mqlData = await mqlResponse.json();
        console.log(`MQL response for lead ${lead.id}:`, JSON.stringify(mqlData).substring(0, 500));

        // Extract data from response - handle various response structures
        const enrichmentData = {
          lead_id: lead.id,
          project_id: projectId,
          enriched_at: new Date().toISOString(),
          mql_rating: mqlData.mql_rating || mqlData.rating || null,
          mql_capability: mqlData.mql_capability || mqlData.capability || null,
          mql_lifestyle: mqlData.mql_lifestyle || mqlData.lifestyle || null,
          credit_score: mqlData.person_info?.credit_score || mqlData.credit_score || null,
          age: mqlData.person_info?.age || mqlData.demography?.age || null,
          gender: mqlData.person_info?.gender || mqlData.demography?.gender || null,
          location: mqlData.person_info?.location || mqlData.demography?.location || null,
          employer_name: mqlData.employment_details?.employer_name || mqlData.employer_name || null,
          designation: mqlData.employment_details?.designation || mqlData.designation || null,
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
