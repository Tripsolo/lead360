import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CIS_PROMPT = `Evaluate the quality of CRM visit comments and return a CIS (Compliance & Insight Score).

**COMPLIANCE SCORE (50 pts)** - Check if these required data points are captured in comments:
- Budget mentioned (e.g., "1.3Cr", "Budget: 1.5Cr"): 5 pts
- Carpet area requirement (e.g., "Carpet: 950sqft", "Looking for 1000+ carpet"): 5 pts
- In-hand funds (e.g., "In hand: 50L", "Ready funds: 40%"): 5 pts
- Finalization timeline (e.g., "Finalization: 2 weeks", "Decision by month-end"): 5 pts
- Possession preference (e.g., "Possession: ASAP", "Ready to move", "2026 okay"): 5 pts
- Core motivation (e.g., "Upgrade", "Investment", "End-use", "Relocation"): 5 pts
- Current residence details (e.g., "Currently in 2BHK Thane", "Renting in Mumbai"): 5 pts
- Family composition (e.g., "Couple + 2 kids", "Joint family", "Nuclear family"): 5 pts
- Income/funding source (e.g., "Salaried IT", "Business owner", "NRI", "Loan eligible"): 5 pts
- Spot closure attempted (e.g., "Token discussed", "Tried closing", "Offered discount"): 5 pts

**INSIGHT DEPTH SCORE (50 pts)** - Quality of insights captured:
- Competitor comparison with specific details (name, price, carpet area): 10 pts
- Pricing gap quantified (e.g., "Gap of 15L", "Expects 10% discount"): 8 pts
- Sample flat/roots feedback with specific observations: 8 pts
- Non-booking reason clearly documented: 8 pts
- Decision maker context (who needs to be consulted, family dynamics): 6 pts
- Lifestyle/family context beyond basic facts: 5 pts
- Detailed narrative with specific observations (>50 words): 5 pts

Return ONLY this JSON:
{
  "compliance_score": <0-50>,
  "insight_score": <0-50>,
  "cis_total": <0-100>,
  "cis_rating": "<Exceptional|Good|Adequate|Needs Improvement|Poor>",
  "compliance_flags": {"budget":true/false,"carpet":true/false,"in_hand_funds":true/false,"finalization_time":true/false,"possession_preference":true/false,"core_motivation":true/false,"current_residence":true/false,"family_composition":true/false,"income_funding":true/false,"spot_closure_attempted":true/false},
  "insight_flags": {"competitor_details":true/false,"pricing_gap_quantified":true/false,"sample_flat_feedback":true/false,"non_booking_reason":true/false,"decision_maker_context":true/false,"lifestyle_context":true/false,"detailed_narrative":true/false}
}

CIS Rating: Exceptional (90+), Good (70-89), Adequate (50-69), Needs Improvement (30-49), Poor (<30)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leads } = await req.json();
    if (!leads?.length) {
      return new Response(JSON.stringify({ error: 'No leads provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing CIS for ${leads.length} leads`);

    const results = [];
    for (const lead of leads) {
      try {
        const crm = lead.crmData || {};
        const visitComments = `${crm['Visit Comments (Not for Reports)'] || ''} ${crm['Site Re-Visit Comment'] || ''}`.trim();
        
        if (!visitComments) {
          console.log(`No comments for ${lead.leadId}, skipping`);
          results.push({ leadId: lead.leadId, cis: 0, error: 'No comments' });
          continue;
        }

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: CIS_PROMPT },
              { role: 'user', content: visitComments }
            ],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`API error for ${lead.leadId}:`, response.status, errText);
          results.push({ leadId: lead.leadId, error: 'API error' });
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error(`No JSON in response for ${lead.leadId}:`, content);
          results.push({ leadId: lead.leadId, error: 'Invalid response' });
          continue;
        }

        const cisResult = JSON.parse(jsonMatch[0]);
        console.log(`CIS for ${lead.leadId}:`, cisResult.cis_total);

        // Update the lead_analyses record
        const existingAnalysis = lead.fullAnalysis || {};
        const existingSignals = (existingAnalysis.extracted_signals as Record<string, unknown>) || {};
        
        const updatedAnalysis = {
          ...existingAnalysis,
          extracted_signals: {
            ...existingSignals,
            crm_compliance_assessment: {
              compliance_score: cisResult.compliance_score,
              insight_score: cisResult.insight_score,
              cis_total: cisResult.cis_total,
              cis_rating: cisResult.cis_rating,
              compliance_flags: cisResult.compliance_flags,
              insight_flags: cisResult.insight_flags
            }
          }
        };

        const { error: updateError } = await supabase
          .from('lead_analyses')
          .update({ full_analysis: updatedAnalysis })
          .eq('id', lead.analysisId);

        if (updateError) {
          console.error(`Update error for ${lead.leadId}:`, updateError);
          results.push({ leadId: lead.leadId, error: 'Update failed' });
        } else {
          results.push({ leadId: lead.leadId, cis: cisResult.cis_total });
        }

        // Small delay between API calls
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error processing ${lead.leadId}:`, err);
        results.push({ leadId: lead.leadId, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
