import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, projectId } = await req.json();
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project and brand metadata
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, brands(*)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandMetadata = project.brands.metadata;
    const projectMetadata = project.metadata;

    console.log(`Processing ${leads.length} leads for project ${projectId}`);

    // Step 1: Check for existing analyses in the database
    const leadIds = leads.map((l: any) => l.id);
    const { data: existingAnalyses } = await supabase
      .from('lead_analyses')
      .select('*')
      .in('lead_id', leadIds)
      .eq('project_id', projectId);

    console.log(`Found ${existingAnalyses?.length || 0} existing analyses in cache`);

    // Step 2: Categorize leads (cached, re-analyze, or new)
    const leadsToAnalyze: any[] = [];
    const cachedResults: any[] = [];

    for (const lead of leads) {
      const existingAnalysis = existingAnalyses?.find(a => a.lead_id === lead.id);
      
      if (!existingAnalysis) {
        // New lead - needs analysis
        leadsToAnalyze.push(lead);
        continue;
      }

      // Check if revisit date has changed
      const newRevisitDate = lead.rawData?.['Latest Revisit Date'] || null;
      const storedRevisitDate = existingAnalysis.revisit_date_at_analysis;

      // Parse dates for comparison
      const newRevisitTime = newRevisitDate ? new Date(newRevisitDate).getTime() : null;
      const storedRevisitTime = storedRevisitDate ? new Date(storedRevisitDate).getTime() : null;

      if (newRevisitTime !== storedRevisitTime) {
        // Revisit date changed - re-analyze
        console.log(`Lead ${lead.id} has new revisit date - re-analyzing`);
        leadsToAnalyze.push(lead);
      } else {
        // Use cached result
        console.log(`Lead ${lead.id} using cached analysis`);
        cachedResults.push({
          leadId: lead.id,
          rating: existingAnalysis.rating,
          insights: existingAnalysis.insights,
          fullAnalysis: existingAnalysis.full_analysis,
          parseSuccess: true,
          fromCache: true
        });
      }
    }

    console.log(`${leadsToAnalyze.length} leads need fresh analysis, ${cachedResults.length} from cache`);

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

    // Step 3: Only analyze leads that need it
    const analysisPromises = leadsToAnalyze.map(async (lead: any, index: number) => {
      // Add small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      const leadDataJson = JSON.stringify(lead, null, 2);

      // Build brand context section
      const brandContext = `# BRAND CONTEXT
Developer: ${brandMetadata?.developer?.name || 'Unknown'}
Legacy: ${brandMetadata?.developer?.legacy || 'N/A'}
Reputation: ${brandMetadata?.developer?.reputation || 'N/A'}
Trust Signals: ${brandMetadata?.developer?.trust_signals?.join(', ') || 'N/A'}`;

      // Build project context section
      const projectContext = `# PROJECT CONTEXT: ${projectMetadata?.project_name || project.name}

## Location
${projectMetadata?.location?.address || 'N/A'}
Micro-market: ${projectMetadata?.location?.micro_market || 'N/A'}
Positioning: ${projectMetadata?.location?.positioning || 'N/A'}
Walk-to-Work Employers: ${projectMetadata?.location?.walk_to_work_employers?.join(', ') || 'N/A'}
Medical Hub: ${projectMetadata?.location?.medical_hub?.join(', ') || 'N/A'}

## Township Features
${projectMetadata?.township ? `
Name: ${projectMetadata.township.name}
Total Area: ${projectMetadata.township.total_area_acres} acres
Grand Central Park: ${projectMetadata.township.grand_central_park?.area_acres} acres with ${projectMetadata.township.grand_central_park?.trees} trees
Open Space: ${projectMetadata.township.open_space_percent}%
Vehicle-Free Podium: ${projectMetadata.township.podium_acres} acres
` : 'N/A'}

## USPs
Primary: ${projectMetadata?.usps?.primary?.map((usp: string) => `\n- ${usp}`).join('') || 'N/A'}
Construction Quality: ${projectMetadata?.usps?.construction_quality?.map((qual: string) => `\n- ${qual}`).join('') || 'N/A'}

## Inventory Configurations
${projectMetadata?.inventory?.configurations?.map((config: any) => `
- ${config.type}: ${config.carpet_sqft_range[0]}-${config.carpet_sqft_range[1]} sqft, ₹${config.price_range_cr[0]}-${config.price_range_cr[1]} Cr
  Target: ${config.target_persona}
  Notes: ${config.notes}`).join('\n') || 'N/A'}

## Common Objections & Rebuttals
${projectMetadata?.common_objections ? Object.entries(projectMetadata.common_objections).map(([key, obj]: [string, any]) => `
- ${key}: ${obj.objection}
  Rebuttal: ${obj.rebuttal}`).join('\n') : 'N/A'}

## Competitors
${projectMetadata?.competitors ? Object.entries(projectMetadata.competitors).map(([key, comp]: [string, any]) => `
- ${key}: ${comp.projects?.join(', ')}
  Strength: ${comp.perceived_strength}
  Positioning: ${comp.positioning}`).join('\n') : 'N/A'}

## Buyer Personas
${projectMetadata?.buyer_personas ? Object.entries(projectMetadata.buyer_personas).map(([key, persona]: [string, any]) => `
- ${key}: ${persona.profile}
  Drivers: ${persona.drivers}
  Talking Points: ${persona.talking_points}`).join('\n') : 'N/A'}

## Payment Plans
${projectMetadata?.payment_plans ? Object.entries(projectMetadata.payment_plans).map(([key, plan]: [string, any]) => `
- ${key}: ${plan.description}
  Target: ${plan.target}`).join('\n') : 'N/A'}`;

      const fullPrompt = `${systemPrompt}

${brandContext}

${projectContext}

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
7. Generate both a persona label and a professional 2-line persona description
8. Create actionable next steps and talking points

# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Summary: Maximum 35 words. Be concise and focused.
- Next Best Action: Maximum 20 words. Keep it actionable and specific.
- Key Concerns: These must be the CUSTOMER'S concerns about the project or specific unit they are considering. Focus on: price/budget gap, location/connectivity issues, possession date/timeline, unit configuration/size, amenities/facilities. DO NOT include generic sales concerns.
- Concern Categories: For EACH key_concern, classify it into ONE of these categories (same order as key_concerns array):
  1. "Price" - Budget gaps, pricing issues, financing concerns, EMI issues
  2. "Location" - Connectivity, infrastructure, surroundings, pollution, traffic, facilities nearby
  3. "Possession" - Delivery timeline, construction delays, handover dates
  4. "Config" - Unit configuration, layout issues, view concerns, floor preference, carpet area
  5. "Amenities" - Amenities in home or complex, facilities
  6. "Trust" - Builder reputation, track record concerns
  7. "Others" - Anything else
- Primary Concern Category: The SINGLE most important concern category. If multiple concerns exist, pick the one that appears FIRST in the priority order above (Price > Location > Possession > Config > Amenities > Trust > Others)

# TALKING POINTS GENERATION (CRITICAL - FOLLOW PRIORITY RULES):
Generate 2-3 talking points TOTAL following these strict priority rules:

PRIORITY 1: Competitor Handling (Max 2 points)
- Only include if any competitor is mentioned in CRM data (competitor name, competition project, or visit comments)
- Maximum 2 talking points for competitor handling
- Each point max 15 words
- Topic type: "Competitor handling"

PRIORITY 2: Objection Handling (Max 1 point)
- Only include if customer has specific concerns or objections from notes or CRM fields
- Maximum 1 talking point for objection handling
- Max 15 words
- Topic type: "Objection handling"

PRIORITY 3: What to Highlight (Max 2 points)
- Pick the project USPs/value propositions most relevant to the customer's persona and profile
- Maximum 2 talking points for highlighting features
- Each point max 15 words
- Topic type: "What to highlight"

DISTRIBUTION RULES:
- Minimum 2 talking points, maximum 3 talking points total
- If competitor mentioned: Include 1-2 competitor handling points first
- If customer has concerns/objections: Include 1 objection handling point second
- Fill remaining slots (up to 3 total) with "What to highlight" points
- Each talking point must be max 15 words

Return a JSON object with this EXACT structure:
{
  "ai_rating": "Hot" | "Warm" | "Cold",
  "rating_confidence": "High" | "Medium" | "Low",
  "rating_rationale": "Brief 1-2 sentence explanation",
  "persona": "Upgrade Seeker" | "First-Time Buyer" | "Investor" | "NRI Buyer" | "Retirement Planner" | "Business Owner" | "Growing Family" | "Professional Couple",
  "persona_description": "A professional 2-line description that captures the lead's occupation, lifestyle, family situation, and key buying motivation. Make it concise and insightful.",
  "summary": "2-3 sentence overview of lead situation and intent",
  "key_concerns": ["concern1", "concern2", "concern3"],
  "concern_categories": ["Price", "Location", "Config"],
  "primary_concern_category": "Price",
  "next_best_action": "Specific actionable recommendation with timing",
  "talking_points": [
    {
      "type": "Competitor handling" | "Objection handling" | "What to highlight",
      "point": "The talking point text (max 15 words)"
    }
  ],
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
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google AI API error:', errorText);
        throw new Error(`Failed to analyze lead: ${errorText}`);
      }

      const data = await response.json();

      // Safely extract the model response text
      const candidate = data?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const analysisText = typeof part?.text === 'string' ? part.text : JSON.stringify(candidate ?? data);
      
      // Parse JSON response
      let analysisResult;
      let parseSuccess = true;
      
      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        parseSuccess = false;
        console.error('Failed to parse AI response as JSON for lead:', lead.id);
        console.error('Response preview:', analysisText.substring(0, 500));
        
        // Attempt retry with simplified prompt if response was truncated
        try {
          const simplifiedPrompt = `Analyze this lead and return ONLY this JSON structure (no additional text):
{
  "ai_rating": "Hot/Warm/Cold",
  "rating_confidence": "High/Medium/Low",
  "rating_rationale": "Brief explanation",
  "summary": "2-3 sentence overview"
}

Lead data:
${leadDataJson}`;

          const retryResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: simplifiedPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1024,
                  responseMimeType: "application/json"
                }
              }),
            }
          );

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (retryText) {
              analysisResult = JSON.parse(retryText);
              parseSuccess = true;
              console.log('Retry successful for lead:', lead.id);
            }
          }
        } catch (retryError) {
          console.error('Retry failed for lead:', lead.id, retryError);
        }
        
        // Final fallback if retry also failed
        if (!parseSuccess) {
          const lower = analysisText.toLowerCase();
          let rating: 'Hot' | 'Warm' | 'Cold' = 'Warm';
          if (lower.includes('"ai_rating"') && (lower.includes('hot') || lower.includes('"hot"'))) {
            rating = 'Hot';
          } else if (lower.includes('cold') || lower.includes('"cold"')) {
            rating = 'Cold';
          }
          
          analysisResult = {
            ai_rating: rating,
            rating_confidence: 'Low',
            rating_rationale: 'Analysis completed with limited structure due to response truncation',
            summary: analysisText.substring(0, 200) + '...',
            insights: 'Partial analysis - retry recommended'
          };
        }
      }

      return {
        leadId: lead.id,
        rating: analysisResult.ai_rating,
        insights: analysisResult.summary || analysisResult.rating_rationale,
        fullAnalysis: analysisResult,
        parseSuccess,
        fromCache: false,
        revisitDate: lead.rawData?.['Latest Revisit Date'] || null
      };
    });

    const freshResults = await Promise.all(analysisPromises);

    // Step 4: Store/update results in the database
    for (const result of freshResults) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find(l => l.id === result.leadId);
        if (!lead) continue;

        // Upsert lead data
        await supabase
          .from('leads')
          .upsert({
            lead_id: lead.id,
            project_id: projectId,
            crm_data: lead.rawData,
            latest_revisit_date: result.revisitDate || null
          }, {
            onConflict: 'lead_id,project_id'
          });

        // Upsert analysis
        await supabase
          .from('lead_analyses')
          .upsert({
            lead_id: lead.id,
            project_id: projectId,
            rating: result.rating,
            insights: result.insights,
            full_analysis: result.fullAnalysis,
            revisit_date_at_analysis: result.revisitDate || null
          }, {
            onConflict: 'lead_id,project_id'
          });

        console.log(`Stored analysis for lead ${lead.id}`);
      }
    }
    
    // Step 5: Combine cached and fresh results
    const allResults = [...cachedResults, ...freshResults];
    
    const successCount = allResults.filter(r => r.parseSuccess).length;
    const failedLeads = allResults.filter(r => !r.parseSuccess).map(r => r.leadId);
    const cachedCount = cachedResults.length;
    const freshCount = freshResults.filter(r => r.parseSuccess).length;
    
    console.log(`Analysis complete: ${successCount}/${allResults.length} successful (${cachedCount} cached, ${freshCount} fresh)`);
    if (failedLeads.length > 0) {
      console.log('Failed leads:', failedLeads);
    }

    return new Response(
      JSON.stringify({ 
        results: allResults,
        meta: {
          total: allResults.length,
          successful: successCount,
          failed: failedLeads.length,
          cached: cachedCount,
          fresh: freshCount,
          failedLeadIds: failedLeads
        }
      }),
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
