import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CIS_PROMPT = `Evaluate CRM data quality and return a JSON object with CIS scores.

**Compliance Score (50 pts)** - 5 pts each for these fields if filled with meaningful data:
1. customerName 2. phone 3. occupation 4. currentResidence 5. workLocation 
6. budgetRange 7. configPreference 8. visitComments 9. managerRating 10. nextFollowUp

**Insight Depth Score (50 pts)** - Points for quality insights in visit comments:
- Customer motivation/timeline mentioned: 10 pts
- Competitor comparison noted: 10 pts  
- Specific objections/concerns captured: 10 pts
- Family/decision-maker info: 5 pts
- Budget constraints detailed: 5 pts
- Property preferences specific: 5 pts
- Negotiation points noted: 5 pts

Return ONLY this JSON structure:
{
  "compliance_score": <0-50>,
  "insight_score": <0-50>,
  "cis_total": <0-100>,
  "cis_rating": "<Excellent|Good|Average|Poor>",
  "compliance_flags": {"customerName":true/false,...},
  "insight_flags": {"motivation":true/false,...}
}

CIS Rating: Excellent (85+), Good (70-84), Average (50-69), Poor (<50)`;

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
        const crmSummary = {
          customerName: crm['Customer Name'] || '',
          phone: crm['Cust Mobile'] || '',
          occupation: crm['Occupation'] || '',
          currentResidence: crm['Area of Residence'] || '',
          workLocation: crm['Work Location'] || '',
          budgetRange: crm['Budget'] || '',
          configPreference: crm['Config Interested'] || '',
          visitComments: `${crm['Visit Comment'] || ''} ${crm['Revisit Comments'] || ''}`.trim(),
          managerRating: crm['Walkin Manual Rating'] || '',
          nextFollowUp: crm['Revisit Date'] || ''
        };

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            messages: [
              { role: 'system', content: CIS_PROMPT },
              { role: 'user', content: JSON.stringify(crmSummary) }
            ],
            max_tokens: 500,
            temperature: 0.1
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
