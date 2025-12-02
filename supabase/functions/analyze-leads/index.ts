import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, projectId } = await req.json();
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({
          error: "Google AI API key not configured. Please add GOOGLE_AI_API_KEY to your Supabase secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project and brand metadata
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, brands(*)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Error fetching project:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandMetadata = project.brands.metadata;
    const projectMetadata = project.metadata;

    console.log(`Processing ${leads.length} leads for project ${projectId}`);

    // Step 1: Check for existing analyses in the database
    const leadIds = leads.map((l: any) => l.id);
    const { data: existingAnalyses } = await supabase
      .from("lead_analyses")
      .select("*")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    console.log(`Found ${existingAnalyses?.length || 0} existing analyses in cache`);

    // Step 2: Categorize leads (cached, re-analyze, or new)
    const leadsToAnalyze: any[] = [];
    const cachedResults: any[] = [];

    for (const lead of leads) {
      const existingAnalysis = existingAnalyses?.find((a) => a.lead_id === lead.id);

      if (!existingAnalysis) {
        // New lead - needs analysis
        leadsToAnalyze.push(lead);
        continue;
      }

      // Check if revisit date has changed
      const newRevisitDate = lead.rawData?.["Latest Revisit Date"] || null;
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
          fromCache: true,
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

    const leadScoringModel = `# LEAD SCORING MODEL: PPS (Predictive Probability Score) FRAMEWORK

You MUST calculate a numerical PPS Score (0-100) based on 5 weighted dimensions. The final rating is derived from the PPS score.

## RATING THRESHOLDS (CRITICAL):
- PPS >= 85: HOT
- PPS >= 65 and < 85: WARM  
- PPS < 65: COLD

## DIMENSION A: FINANCIAL CAPABILITY (FC) - 30 Points Max

### A1. Occupational Wealth Mapping (10 pts):
- Elite Corporate (VP, Director, CHRO, CXO at major firms): 10 pts
- High-Skill Professional (Specialist Doctors, CA Partners, Pilots, Merchant Navy Officers): 9 pts
- Business Owner (SME/Traders) - Cash rich: 8 pts
- Mid-Senior Corporate (Sr. Manager, Project Manager at IT/Banking/MNCs): 7 pts
- Retired/Homemaker (with visible asset base): 5 pts
- Entry/Mid-Level Salaried (Sales Manager, Executive, Jr. Engineer): 4 pts
- Unknown/Unclear occupation: 2 pts

### A2. Budget Gap Ratio (10 pts):
Calculate gap = (Unit Price - Stated Budget) / Unit Price * 100
- Negative gap (Budget > Price): 10 pts
- Gap 0-10%: 8 pts
- Gap 10-20%: 5 pts
- Gap 20-30%: 3 pts
- Gap > 30% or Budget not stated: 1 pt

### A3. Source of Funds Liquidity (10 pts):
- Self-Funding / Ready Funds / Cash available: 10 pts
- Pre-approved Loan / High eligibility mentioned: 9 pts
- Loan (eligibility unchecked but salaried stable): 7 pts
- Sale of Property (SOP) - process started: 5 pts
- Sale of Property - not yet started: 3 pts
- Unclear / Undisclosed / Not planned: 2 pts

## DIMENSION B: INTENT & ENGAGEMENT (IE) - 25 Points Max

### B1. Visit Behavior (10 pts):
- 3+ Revisits OR brought full family: 10 pts
- 2nd Revisit: 8 pts
- First Visit but duplicate lead (returned): 7 pts
- First Visit only: 5 pts

### B2. Product Engagement (10 pts):
- Sample flat/Roots visited + Positive feedback: 10 pts
- Sample flat toured + Neutral feedback: 7 pts
- Discussion/Presentation only (skipped tour): 4 pts
- Quick walkthrough / Left early (4-5 mins): 2 pts
- Negative feedback on quality/design: 0 pts

### B3. Competitor Awareness Signal (5 pts):
- Visited premium competitors (Oberoi, Godrej, Hiranandani): 5 pts (indicates budget capacity)
- Visited similar segment (Runwal, Dosti, Rustomjee): 4 pts
- Visited lower segment (Lodha affordable, Puraniks): 3 pts
- No competitors mentioned: 2 pts (early funnel but unknown budget)

## DIMENSION C: URGENCY & TIMELINE (UT) - 20 Points Max

### C1. Possession Timeline Fit (10 pts):
- Stage preference matches project delivery: 10 pts
- Flexible / "Willing to wait": 7 pts
- Needs slightly earlier (6 months gap): 4 pts
- Needs RTMI but project is 1+ year: 2 pts

### C2. Life Trigger Urgency (10 pts):
- Currently on rent (double outflow pain): 10 pts
- Marriage / Relocation / Job transfer trigger: 10 pts
- Tenant in competitor building: 10 pts (highest urgency)
- Upgrade from owned property (lifestyle): 6 pts
- Investment purpose: 5 pts
- "Just exploring" / Casual / General enquiry: 2 pts

## DIMENSION D: PRODUCT-MARKET FIT (PMF) - 15 Points Max

### D1. Configuration Match (10 pts):
- Exact match (BHK, area, specific features like balcony, Vastu): 10 pts
- Minor compromise required (floor/view flexibility): 7 pts
- Major compromise (budget vs size mismatch): 4 pts
- No suitable inventory available: 0 pts

### D2. Location Fit (5 pts):
- Works in nearby hub (Powai, Vikhroli, Thane corridor, LBS): 5 pts
- Lives/works in micro-market (Bhiwandi business): 5 pts
- Migration from premium area (Mulund) - price arbitrage: 4 pts
- Remote location with no work/family ties: 2 pts

## DIMENSION E: AUTHORITY & DECISION DYNAMICS (ADD) - 10 Points Max

- All decision makers present during visit: 10 pts
- Partial DM (needs spouse/parent/child consultation): 5 pts
- Representative/proxy visit (came for someone else): 2 pts
- Vastu/Pandit consultation pending: 3 pts (score capped until resolved)

## SPECIAL SIGNALS & MULTIPLIERS (Apply after base calculation):

### Positive Multipliers:
- "Biophilic Buyer" - Mentions greenery/park/open space appreciation: +3 to PMF
- Bhiwandi Business Owner - Local + cash-rich profile: +5 to FC
- Existing brand customer (Kalpataru resident): +5 to IE
- Spot closure discussion initiated by customer: +5 to UT

### Negative Signals:
- Investment-only with budget below 1BHK: Cap total score at 40
- "Came on behalf of someone else": Cap ADD at 2
- Strong stated preference for competitor with booking: -10 from total

## CALCULATION INSTRUCTIONS:
1. Score each sub-dimension based on CRM data
2. Sum each dimension (FC max 30, IE max 25, UT max 20, PMF max 15, ADD max 10)
3. Apply special multipliers if applicable
4. Total PPS Score = FC + IE + UT + PMF + ADD (cap at 100)
5. Derive rating from PPS: >=85 HOT, >=65 WARM, <65 COLD`;

    const personaDefinitions = `# PERSONA IDENTIFICATION GUIDE

## Detection Rules (Check in Priority Order)

### 1. NRI Buyer (Highest Priority)
Detection: Correspondence Country = NOT India OR Country field indicates overseas location
Characteristics:
- Higher budget capability due to forex advantage
- Prefers video calls, digital documentation
- Needs extra trust signals (brand reputation, delivery track record)
- May need assistance with India-specific regulations

### 2. Retirement Planner
Detection: Occupation = "Retired" OR Designation mentions "Retired"
Characteristics:
- Often selling existing property (SOP funding)
- Values greenery, open spaces, healthcare proximity
- Prefers ground/lower floors for accessibility
- Budget typically from accumulated savings + SOP

### 3. Business Owner
Detection: Occupation = "Business" OR "Self-Employed" OR Designation contains "Owner"/"Proprietor"/"Director" (non-corporate)
Characteristics:
- Self-funding capability (cash-rich)
- Prefers premium/exclusive units
- May want multiple units (investment angle)
- Flexible on timing, decisive when interested

### 4. Investor
Detection: Comments mention "investment"/"rental income"/"tax saving"/"appreciation" OR Purpose = Investment
Characteristics:
- Prefers smaller units (1-2 BHK) for rental yield
- Focuses on ROI, rental potential, appreciation
- May not visit site personally
- Price-sensitive, compares multiple options

### 5. Upgrade Seeker
Detection: Building Name is populated (currently owns/rents) AND shows indicators of wanting larger/better home
Characteristics:
- Currently owns/rents smaller home
- Family growing or lifestyle upgrade needed
- Budget typically 1.5-2x current home value
- Compares amenities and space improvements

### 6. First-Time Buyer
Detection: Building Name is empty/unclear AND Source of Funding = Loan AND no prior property ownership indicated
Characteristics:
- Currently renting (no owned property)
- First property purchase - needs process guidance
- Loan-dependent, may need pre-approval assistance
- Longer decision cycle, involves family in decisions

### 7. Fallback: Custom Persona (Use if none of the above match clearly)
If the lead doesn't clearly fit any of the above personas, generate a custom 2-word persona label based on:
- Their primary occupation/profession (e.g., "IT Professional", "Healthcare Worker", "Teacher")
- Life stage indicators (e.g., "Young Couple", "Growing Family", "Mid-Career Executive")
- Core motivation (e.g., "Proximity Seeker" for someone prioritizing work location)

Examples of fallback personas: "IT Professional", "Healthcare Worker", "Young Couple", "Mid-Career Executive", "Family Migrant", "Corporate Professional"

## PERSONA SELECTION INSTRUCTIONS:
1. Check detection rules in PRIORITY ORDER (NRI > Retirement > Business Owner > Investor > Upgrade Seeker > First-Time Buyer)
2. Select the FIRST persona whose detection criteria are met
3. If NO predefined persona matches clearly, use the Fallback to generate a custom 2-word label
4. Generate a 2-line persona_description that aligns with the selected persona type`;

    // Step 3: Only analyze leads that need it
    const analysisPromises = leadsToAnalyze.map(async (lead: any, index: number) => {
      // Add small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 100));

      const leadDataJson = JSON.stringify(lead, null, 2);

      // Build brand context section
      const brandContext = `# BRAND CONTEXT
Developer: ${brandMetadata?.developer?.name || "Unknown"}
Legacy: ${brandMetadata?.developer?.legacy || "N/A"}
Reputation: ${brandMetadata?.developer?.reputation || "N/A"}
Trust Signals: ${brandMetadata?.developer?.trust_signals?.join(", ") || "N/A"}`;

      // Build project context section
      const projectContext = `# PROJECT CONTEXT: ${projectMetadata?.project_name || project.name}

## Location
${projectMetadata?.location?.address || "N/A"}
Micro-market: ${projectMetadata?.location?.micro_market || "N/A"}
Positioning: ${projectMetadata?.location?.positioning || "N/A"}
Walk-to-Work Employers: ${projectMetadata?.location?.walk_to_work_employers?.join(", ") || "N/A"}
Medical Hub: ${projectMetadata?.location?.medical_hub?.join(", ") || "N/A"}

## Township Features
${
  projectMetadata?.township
    ? `
Name: ${projectMetadata.township.name}
Total Area: ${projectMetadata.township.total_area_acres} acres
Grand Central Park: ${projectMetadata.township.grand_central_park?.area_acres} acres with ${projectMetadata.township.grand_central_park?.trees} trees
Open Space: ${projectMetadata.township.open_space_percent}%
Vehicle-Free Podium: ${projectMetadata.township.podium_acres} acres
`
    : "N/A"
}

## USPs
Primary: ${projectMetadata?.usps?.primary?.map((usp: string) => `\n- ${usp}`).join("") || "N/A"}
Construction Quality: ${projectMetadata?.usps?.construction_quality?.map((qual: string) => `\n- ${qual}`).join("") || "N/A"}

## Inventory Configurations
${
  projectMetadata?.inventory?.configurations
    ?.map(
      (config: any) => `
- ${config.type}: ${config.carpet_sqft_range[0]}-${config.carpet_sqft_range[1]} sqft, ₹${config.price_range_cr[0]}-${config.price_range_cr[1]} Cr
  Target: ${config.target_persona}
  Notes: ${config.notes}`,
    )
    .join("\n") || "N/A"
}

## Common Objections & Rebuttals
${
  projectMetadata?.common_objections
    ? Object.entries(projectMetadata.common_objections)
        .map(
          ([key, obj]: [string, any]) => `
- ${key}: ${obj.objection}
  Rebuttal: ${obj.rebuttal}`,
        )
        .join("\n")
    : "N/A"
}

## Competitors
${
  projectMetadata?.competitors
    ? projectMetadata.competitors
        .map(
          (comp: any) => `
- ${comp.developer}: ${comp.projects ? Object.keys(comp.projects).join(", ") : "N/A"}
  Strength: ${comp.perceived_strength || "N/A"}
  Positioning: ${comp.positioning || "N/A"}`,
        )
        .join("\n")
    : "N/A"
}

## Buyer Personas
${
  projectMetadata?.buyer_personas
    ? Object.entries(projectMetadata.buyer_personas)
        .map(
          ([key, persona]: [string, any]) => `
- ${key}: ${persona.profile}
  Drivers: ${persona.drivers}
  Talking Points: ${persona.talking_points}`,
        )
        .join("\n")
    : "N/A"
}

## Payment Plans
${
  projectMetadata?.payment_plans
    ? Object.entries(projectMetadata.payment_plans)
        .map(
          ([key, plan]: [string, any]) => `
- ${key}: ${plan.description}
  Target: ${plan.target}`,
        )
        .join("\n")
    : "N/A"
}`;

      const fullPrompt = `${systemPrompt}

${brandContext}

${projectContext}

${crmFieldExplainer}

${leadScoringModel}

${personaDefinitions}

# LEAD DATA TO ANALYZE
${leadDataJson}

# ANALYSIS INSTRUCTIONS
1. Read all fields carefully - especially visit comments which contain the richest data.
2. Extract structured information (Budget, In-hand funds, Finalization time, etc.)
3. Calculate the PPS Score using the 5-dimension framework:
   - Score Financial Capability (A1 + A2 + A3, max 30)
   - Score Intent & Engagement (B1 + B2 + B3, max 25)
   - Score Urgency & Timeline (C1 + C2, max 20)
   - Score Product-Market Fit (D1 + D2, max 15)
   - Score Authority & Decision Dynamics (max 10)
   - Apply special multipliers if applicable
   - Sum all dimensions for total PPS (0-100)
4. Derive rating from PPS: >=75 HOT, >=45 WARM, <45 COLD
5. Identify persona using the Persona Identification Guide - check detection rules in priority order (NRI > Retirement > Business Owner > Investor > Upgrade Seeker > First-Time Buyer > Fallback Custom)
6. Generate a 2-line persona_description that captures occupation, lifestyle, family situation, and buying motivation - must align with selected persona
7. Create actionable next steps and talking points

# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Rating rationale should only focus on the overall score and reasoning. Do not specify individual dimension scores. When using dimension names, use full names instead of acronyms
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.
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
  "pps_score": 0-100,
  "pps_breakdown": {
    "financial_capability": 0-30,
    "intent_engagement": 0-25,
    "urgency_timeline": 0-20,
    "product_market_fit": 0-15,
    "authority_dynamics": 0-10
  },
  "rating_rationale": "PPS Score: X/100 (Rating). 2-3 line description and highlight the dimensions where the lead had top and bottom scores",
  "persona": "NRI Buyer" | "Retirement Planner" | "Business Owner" | "Investor" | "Upgrade Seeker" | "First-Time Buyer" | OR custom 2-word label if none match (e.g. "IT Professional", "Healthcare Worker", "Young Couple"),
  "persona_description": "A professional 2-line description that captures the lead's occupation, lifestyle, family situation, and buying motivation. Must align with the identified persona type.",
  "summary": "2-3 sentence overview of key buying motivation, visit experience and intent",
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google AI API error:", errorText);
        throw new Error(`Failed to analyze lead: ${errorText}`);
      }

      const data = await response.json();

      // Safely extract the model response text
      const candidate = data?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const analysisText = typeof part?.text === "string" ? part.text : JSON.stringify(candidate ?? data);

      // Parse JSON response
      let analysisResult;
      let parseSuccess = true;

      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        parseSuccess = false;
        console.error("Failed to parse AI response as JSON for lead:", lead.id);
        console.error("Response preview:", analysisText.substring(0, 500));

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
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: simplifiedPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 1024,
                  responseMimeType: "application/json",
                },
              }),
            },
          );

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (retryText) {
              analysisResult = JSON.parse(retryText);
              parseSuccess = true;
              console.log("Retry successful for lead:", lead.id);
            }
          }
        } catch (retryError) {
          console.error("Retry failed for lead:", lead.id, retryError);
        }

        // Final fallback if retry also failed
        if (!parseSuccess) {
          const lower = analysisText.toLowerCase();
          let rating: "Hot" | "Warm" | "Cold" = "Warm";
          if (lower.includes('"ai_rating"') && (lower.includes("hot") || lower.includes('"hot"'))) {
            rating = "Hot";
          } else if (lower.includes("cold") || lower.includes('"cold"')) {
            rating = "Cold";
          }

          analysisResult = {
            ai_rating: rating,
            rating_confidence: "Low",
            rating_rationale: "Analysis completed with limited structure due to response truncation",
            summary: analysisText.substring(0, 200) + "...",
            insights: "Partial analysis - retry recommended",
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
        revisitDate: lead.rawData?.["Latest Revisit Date"] || null,
      };
    });

    const freshResults = await Promise.all(analysisPromises);

    // Step 4: Store/update results in the database
    for (const result of freshResults) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
        if (!lead) continue;

        // Upsert lead data
        await supabase.from("leads").upsert(
          {
            lead_id: lead.id,
            project_id: projectId,
            crm_data: lead.rawData,
            latest_revisit_date: result.revisitDate || null,
          },
          {
            onConflict: "lead_id,project_id",
          },
        );

        // Upsert analysis
        await supabase.from("lead_analyses").upsert(
          {
            lead_id: lead.id,
            project_id: projectId,
            rating: result.rating,
            insights: result.insights,
            full_analysis: result.fullAnalysis,
            revisit_date_at_analysis: result.revisitDate || null,
          },
          {
            onConflict: "lead_id,project_id",
          },
        );

        console.log(`Stored analysis for lead ${lead.id}`);
      }
    }

    // Step 5: Combine cached and fresh results
    const allResults = [...cachedResults, ...freshResults];

    const successCount = allResults.filter((r) => r.parseSuccess).length;
    const failedLeads = allResults.filter((r) => !r.parseSuccess).map((r) => r.leadId);
    const cachedCount = cachedResults.length;
    const freshCount = freshResults.filter((r) => r.parseSuccess).length;

    console.log(
      `Analysis complete: ${successCount}/${allResults.length} successful (${cachedCount} cached, ${freshCount} fresh)`,
    );
    if (failedLeads.length > 0) {
      console.log("Failed leads:", failedLeads);
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
          failedLeadIds: failedLeads,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in analyze-leads function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
