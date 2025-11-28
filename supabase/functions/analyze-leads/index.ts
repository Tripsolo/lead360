import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads } = await req.json();
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openRouterKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your Supabase secrets.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const systemPrompt = `You are an expert real estate CRM analyst. Analyze leads and rate them as Hot, Warm, or Cold based on:
- Budget alignment with project
- Timeline urgency
- Quality of information provided
- Engagement indicators
- Source reliability

For each lead, provide:
1. Rating (Hot/Warm/Cold)
2. Brief actionable insights (2-3 sentences)

Hot: Strong buying signals, aligned budget, urgent timeline
Warm: Some interest, moderate budget, flexible timeline
Cold: Limited information, misaligned budget, or no urgency`;

    const analysisPromises = leads.map(async (lead: any) => {
      const leadContext = `
Name: ${lead.name}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Project Interest: ${lead.projectInterest || 'Not specified'}
Budget: ${lead.budget || 'Not specified'}
Timeline: ${lead.timeline || 'Not specified'}
Notes: ${lead.notes || 'None'}
Source: ${lead.source || 'Unknown'}
`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://lovable.dev',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this lead:\n${leadContext}` }
          ],
        }),
      });

      if (!response.ok) {
        console.error('OpenRouter API error:', await response.text());
        throw new Error('Failed to analyze lead');
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      // Extract rating from response
      let rating = 'Warm';
      if (analysisText.toLowerCase().includes('hot')) rating = 'Hot';
      else if (analysisText.toLowerCase().includes('cold')) rating = 'Cold';

      return {
        leadId: lead.id,
        rating,
        insights: analysisText,
      };
    });

    const results = await Promise.all(analysisPromises);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-leads function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
