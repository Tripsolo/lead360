import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all lead analyses
    const { error: analysesError } = await supabase
      .from("lead_analyses")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (analysesError) {
      console.error("Error deleting analyses:", analysesError);
    }

    // Delete all lead enrichments
    const { error: enrichmentsError } = await supabase
      .from("lead_enrichments")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (enrichmentsError) {
      console.error("Error deleting enrichments:", enrichmentsError);
    }

    // Delete all leads
    const { error: leadsError } = await supabase
      .from("leads")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (leadsError) {
      console.error("Error deleting leads:", leadsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "All lead cache cleared successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
