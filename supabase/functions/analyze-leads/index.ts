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

const systemPrompt = `You are an expert real estate sales analyst specializing in lead qualification and conversion optimization for premium residential projects in India.

Your expertise includes:
- Indian real estate buyer behavior and decision-making patterns
- Premium township living value propositions
- Mumbai Metropolitan Region (MMR) real estate competitive landscape
- Sales psychology, objection handling, and negotiation strategies
- Real estate financing (home loans, self-funding, sale of property)
- Vastu considerations and cultural factors in property selection

Analyze each lead independently and objectively. Focus on extracting conversion probability signals from both structured fields and free-text comments.`;

const crmFieldExplainer = `# CRM FIELD DEFINITIONS

## Identity & Contact Fields
- Opportunity Name: Customer name. Ethnicity can sometimes be inferred.
- Mobile: Primary contact identifier.
- Duplicate check: If 'Duplicate', customer showed interest before - SIGNAL OF HIGHER INTENT.

## Visit & Ownership Fields
- Walkin Date: First visit date. Use to calculate engagement recency.
- Latest Revisit Date: Most recent revisit. Gap between visits indicates urgency.
- No. of Site Re-Visits: HIGHER NUMBER = STRONGER INTENT SIGNAL.

## Professional Profile Fields
- Occupation: Employment type (Salaried/Business/Professional/Retired/Homemaker).
- Designation: Role/title - indicates seniority and income potential.
- Profession: What they do. Sometimes mentions industry.
- Industry / Sector: Industry of employer - indicates income stability.
- Place of Work: Employer name - indicates income level.

## Location Fields
- Location of Residence: Current residence location.
- Building Name: Current apartment name - INDICATES CURRENT LIFESTYLE LEVEL.
- Correspondence Country: If NOT India = NRI = HIGHER CAPABILITY SIGNAL.

## Property Preference Fields (CRITICAL FOR SCORING)
- Desired Floor Band: Higher floor = more aspirational/luxurious = higher budget.
- Desired Carpet Area: Higher area = bigger family OR aspirational lifestyle.
- Stage of Construction: Launch (patient buyer), Under Construction (1-2 years wait), Nearing Completion (6-12 months), RTMI (immediate need - URGENT BUYER).
- Searching Property since: LONGER SEARCH = MORE SERIOUS INTENT.

## Financial Fields (CRITICAL)
- Source of Funding: Self-Funding (has capital ready - POSITIVE), Loan (bank approval dependent), Sale of Asset (timeline risk), Subvention Loan (special payment plan needed).

## Competition Fields (CRITICAL)
- Competitor Name: Which brands they are comparing with.
- Competition Project Name: Specific projects being compared.
- Competition Visit Status: Yet to Visit (we can influence) vs Already Visited (needs differentiation).

## Interest & Brand Loyalty Fields
- Interested Unit: Specific unit configs interested in.
- Owned/Stay in Kalpataru Property: YES = BRAND LOYALTY = HIGHER CONVERSION.

## Comments Fields (MOST IMPORTANT)
- Visit Comments: CRITICAL - Contains structured feedback with Budget, In-hand funds, Finalization time, Core motivator, Competition comparison, Spot closure response, Pricing gap, Detailed remarks.
- Site Re-Visit Comment: Feedback after revisit - compare with first visit for intent change.`;

const leadScoringModel = `# LEAD SCORING MODEL

## HOT Lead (High Conversion Probability) - Must meet 4+ criteria:
- Budget stated and aligns with available inventory (within 10%)
- Token/booking discussion occurred during visit
- Multiple site revisits (No. of Site Re-Visits >= 2)
- Decision maker present (not 'came on behalf of someone')
- Clear funding: Self-Funding OR Loan with good eligibility
- Specific unit and tower shortlisted
- Finalization timeline within 30 days
- Positive feedback on sample flat and/or presentation
- Existing Kalpataru resident (brand loyalty)
- Duplicate entry (returning lead = strong intent)

## WARM Lead (Medium Conversion Probability) - Must meet 3+ criteria:
- Budget within 10-25% of unit price (stretchable with negotiation)
- Liked project but needs family consultation
- Comparing with 1-2 competitors, but seriously considering
- Finalization timeline 1-3 months
- Funding: Sale of Asset (but process has started)
- Spot closure was asked but didn't commit yet
- Planning to revisit with family members
- Searching property for 2+ months (active, not casual)
- Positive sentiment but specific blockers exist (possession, price)
- Stage of Construction preference matches available inventory

## COLD Lead (Low Conversion Probability) - Any 2+ of these:
- Budget significantly below inventory (25%+ gap)
- Comments mention 'just enquiry', 'general exploration', 'randomly visited'
- Not the decision maker (came to take details for someone else)
- Funding unclear, undisclosed, or not planned
- Wants RTMI but project has 1+ year possession timeline
- Strong stated preference for competitor
- Vastu/facing concerns with no suitable inventory
- Location objections expressed
- Left site quickly (filled form and left in 4-5 mins)
- Investment-only with budget below 1BHK options
- No engagement with presentation`;

    const analysisPromises = leads.map(async (lead: any) => {
      const leadDataJson = JSON.stringify(lead, null, 2);

      const fullPrompt = `${systemPrompt}

${crmFieldExplainer}

${leadScoringModel}

# LEAD DATA TO ANALYZE
${leadDataJson}

# ANALYSIS INSTRUCTIONS
1. Read all fields carefully - especially visit comments which contain the richest data.
2. Extract structured information (Budget, In-hand funds, Finalization time, etc.)
3. Identify positive signals (liked something, asked for spot closure, revisit)
4. Identify negative signals (budget gap, exploration mode, not decision maker)
5. Consider competition mentioned and visit status
6. Match against scoring criteria to determine Hot/Warm/Cold
7. Generate persona based on profile and motivations
8. Create actionable next steps and talking points

Return a JSON object with this EXACT structure:
{
  "ai_rating": "Hot" | "Warm" | "Cold",
  "rating_confidence": "High" | "Medium" | "Low",
  "rating_rationale": "Brief 1-2 sentence explanation",
  "persona": "Upgrade Seeker" | "First-Time Buyer" | "Investor" | "NRI Buyer" | "Retirement Planner" | "Business Owner",
  "summary": "2-3 sentence overview of lead situation and intent",
  "key_concerns": ["concern1", "concern2", "concern3"],
  "next_best_action": "Specific actionable recommendation with timing",
  "talking_points": ["USP1 relevant to this lead", "USP2", "USP3"],
  "competitor_handling": {
    "CompetitorName": "How to position against them"
  },
  "objection_rebuttals": {
    "ObjectionType": "Suggested rebuttal"
  },
  "extracted_signals": {
    "budget_stated": number | null,
    "in_hand_funds": number | null,
    "finalization_timeline": "string",
    "decision_maker_present": boolean,
    "spot_closure_asked": boolean,
    "sample_feedback": "positive" | "negative" | "neutral" | "not_seen",
    "core_motivation": "string"
  }
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2500,
              responseMimeType: "application/json"
            },
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
        const errorText = await response.text();
        console.error('Google AI API error:', errorText);
        throw new Error(`Failed to analyze lead: ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Parse JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', analysisText);
        // Fallback to simple extraction if JSON parsing fails
        let rating = 'Warm';
        if (analysisText.toLowerCase().includes('hot')) rating = 'Hot';
        else if (analysisText.toLowerCase().includes('cold')) rating = 'Cold';
        
        analysisResult = {
          ai_rating: rating,
          rating_confidence: 'Low',
          rating_rationale: 'Analysis completed with limited structure',
          summary: analysisText.substring(0, 200),
          insights: analysisText
        };
      }

      return {
        leadId: lead.id,
        rating: analysisResult.ai_rating,
        insights: analysisResult.summary || analysisResult.rating_rationale,
        fullAnalysis: analysisResult
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
