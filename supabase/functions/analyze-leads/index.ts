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
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Google AI API key not configured. Please add GOOGLE_AI_API_KEY to your Supabase secrets.' 
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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nAnalyze this lead:\n${leadContext}`
              }]
            }],
            tools: [{
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: "MODE_DYNAMIC",
                  dynamicThreshold: 0.3
                }
              }
            }]
          }),
        }
      );

      if (!response.ok) {
        console.error('Google AI API error:', await response.text());
        throw new Error('Failed to analyze lead');
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
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
