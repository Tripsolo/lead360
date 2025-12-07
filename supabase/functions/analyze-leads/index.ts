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

    // Fetch MQL enrichments for all leads
    const { data: mqlEnrichments } = await supabase
      .from("lead_enrichments")
      .select("*")
      .in("lead_id", leadIds)
      .eq("project_id", projectId);

    console.log(
      `Found ${existingAnalyses?.length || 0} existing analyses, ${mqlEnrichments?.length || 0} MQL enrichments`,
    );

    // Step 2: Categorize leads (cached, re-analyze, or new)
    const leadsToAnalyze: any[] = [];
    const cachedResults: any[] = [];

    for (const lead of leads) {
      const existingAnalysis = existingAnalyses?.find((a) => a.lead_id === lead.id);
      const mqlEnrichment = mqlEnrichments?.find((e) => e.lead_id === lead.id);

      if (!existingAnalysis) {
        leadsToAnalyze.push({ ...lead, mqlEnrichment });
        continue;
      }

      // Check if revisit date has changed
      const newRevisitDate = lead.rawData?.["Latest Revisit Date"] || null;
      const storedRevisitDate = existingAnalysis.revisit_date_at_analysis;
      const newRevisitTime = newRevisitDate ? new Date(newRevisitDate).getTime() : null;
      const storedRevisitTime = storedRevisitDate ? new Date(storedRevisitDate).getTime() : null;

      // Check if MQL enrichment is newer than analysis
      const enrichedAt = mqlEnrichment?.enriched_at ? new Date(mqlEnrichment.enriched_at).getTime() : null;
      const analyzedAt = existingAnalysis.analyzed_at ? new Date(existingAnalysis.analyzed_at).getTime() : null;
      const mqlIsNewer = enrichedAt && analyzedAt && enrichedAt > analyzedAt;

      if (newRevisitTime !== storedRevisitTime || mqlIsNewer) {
        console.log(
          `Lead ${lead.id} needs re-analysis (revisit changed: ${newRevisitTime !== storedRevisitTime}, MQL newer: ${mqlIsNewer})`,
        );
        leadsToAnalyze.push({ ...lead, mqlEnrichment });
      } else {
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

    const mqlFieldExplainer = `# MQL ENRICHMENT FIELD DEFINITIONS (External Verified Data)

## Person Info
- mql_rating: MQL Rating ("P0"/"P1"/"P2"/"N/A") - P0 is highest quality, P2 is lowest. N/A means that no data was available to generate a rating
- mql_capability: Budget capability vs cheapest SKU - "high" (120%+), "medium" (within budget), "low" (<80%)
- mql_lifestyle: Lifestyle indicator - "luxury", "aspirational", "value_for_money"
- locality_grade: Current residence quality - "Premium", "Popular", "Affordable"

## Demography
- age: Verified age (use for life stage signals)
- gender: Verified gender
- designation: Verified role + employer (USE THIS OVER CRM designation if available - more accurate)

## Income
- final_income_lacs: Estimated annual income in Lakhs (use for financial capability scoring)

## Credit Profile (NEVER MENTION RAW VALUES IN OUTPUT)
- credit_score: Credit score number
- Credit Rating Derivation Rules: 750+ = "High", 650-749 = "Medium", <650 = "Low"

## Banking Loans (NEVER MENTION SPECIFIC VALUES IN OUTPUT)
- home_loans: Count of home loans (indicates property ownership history)
- active_loans: Current loan obligations (affects new loan eligibility)
- If home_loans > 0: indicates existing property owner (upgrade buyer signal)

## FIELD PRECEDENCE RULES (CRITICAL):
1. Employer Name: ALWAYS use CRM value
2. Location/Residence: ALWAYS use CRM value  
3. Designation: Use MQL value if available (more accurate than CRM)
4. If CRM location significantly differs from MQL locality_grade, add "locality_grade" to overridden_fields array`;

    const leadScoringModel = `# LEAD SCORING MODEL: PPS (Predictive Probability Score) FRAMEWORK

You MUST calculate a numerical PPS Score (0-100) based on 5 weighted dimensions. The final rating is derived from the PPS score.

## RATING THRESHOLDS (CRITICAL):
- PPS >= 85: HOT
- PPS >= 65 and < 85: WARM  
- PPS < 65: COLD

## DIMENSION A: FINANCIAL CAPABILITY (FC) - 30 Points Max

### A1. Occupational Wealth Mapping (10 pts):
Use MQL designation if available, otherwise CRM designation.
Use MQL final_income_lacs if available for income-based adjustments.
- Elite Corporate (VP, Director, CHRO, CXO at major firms) OR income > 50L: 10 pts
- High-Skill Professional (Specialist Doctors, CA Partners, Pilots, Merchant Navy Officers) OR income 30-50L: 9 pts
- Business Owner (SME/Traders) - Cash rich: 8 pts
- Mid-Senior Corporate (Sr. Manager, Project Manager at IT/Banking/MNCs) OR income 15-30L: 7 pts
- Retired/Homemaker (with visible asset base): 5 pts
- Entry/Mid-Level Salaried (Sales Manager, Executive, Jr. Engineer) OR income < 15L: 4 pts
- Unknown/Unclear occupation: 2 pts

### A2. Budget Gap Ratio (10 pts):
Factor in MQL capability rating if available:
- MQL capability "high" + Budget matches: 10 pts
- MQL capability "medium" + Budget matches: 8 pts
- MQL capability "low": Cap at 5 pts regardless of stated budget
- No MQL data: Use standard gap calculation

### A3. Source of Funds Liquidity (10 pts):
Factor in MQL credit_rating and active_loans:
- Self-Funding + High Credit Rating: 10 pts
- Self-Funding + Medium Credit Rating: 9 pts
- Loan + High Credit Rating + active_loans <= 1: 8 pts
- Loan + Medium Credit Rating: 6 pts
- Loan + Low Credit Rating OR active_loans > 2: 4 pts
- Sale of Property: 3-5 pts based on process status
- Unclear: 2 pts

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
- Quick walkthrough / Left early: 2 pts

### B3. Competitor Awareness Signal (5 pts):
If MQL home_loans > 0: +2 bonus (indicates active property buyer)
- Visited premium competitors: 5 pts
- Visited similar segment: 4 pts
- No competitors mentioned: 2 pts

## DIMENSION C: URGENCY & TIMELINE (UT) - 20 Points Max

### C1. Possession Timeline Fit (10 pts):
- Stage preference matches project delivery: 10 pts
- Flexible: 7 pts
- Needs slightly earlier: 4 pts
- Needs RTMI but project is 1+ year: 2 pts

### C2. Life Trigger Urgency (10 pts):
Factor in MQL age for life-stage signals:
- Currently on rent: 10 pts
- Marriage/Relocation trigger: 10 pts
- MQL age 55+ (retirement planning): +2 bonus
- MQL home_loans > 0 (upgrade buyer): +1 bonus
- Investment purpose: 5 pts
- Just exploring: 2 pts

## DIMENSION D: PRODUCT-MARKET FIT (PMF) - 15 Points Max

### D1. Configuration Match (10 pts):
Factor in MQL lifestyle for expectation alignment:
- Exact match + MQL lifestyle "luxury" matches premium project: 10 pts
- Minor compromise: 7 pts
- Major compromise: 4 pts

### D2. Location Fit (5 pts):
Compare MQL locality_grade with project positioning:
- locality_grade matches project tier (Premium→Premium): 5 pts
- One tier aspirational (Popular→Premium): 4 pts
- Large mismatch (Affordable→Luxury): 2 pts
- Use CRM location for work proximity (unchanged)

## DIMENSION E: AUTHORITY & DECISION DYNAMICS (ADD) - 10 Points Max

Factor in MQL age:
- MQL age 55+: Likely self-decision (+2 pts)
- MQL age 25-34: May need family consultation (-1 pt)
- All decision makers present: 10 pts
- Partial DM: 5 pts
- Proxy visit: 2 pts

## SPECIAL SIGNALS & MULTIPLIERS:
- Biophilic Buyer: +3 to PMF
- Business Owner: +5 to FC
- Existing brand customer: +5 to IE
- Investment-only with low budget: Cap at 40
- Strong competitor preference with booking: -10`;

    const personaDefinitions = `# PERSONA IDENTIFICATION GUIDE

## Detection Rules (Check in Priority Order)
Use BOTH CRM and MQL data. MQL lifestyle grade should influence persona description.

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
4. Generate a 2-line persona_description that aligns with the selected persona type

## PERSONA DESCRIPTION INSTRUCTIONS:
Generate a 2-line description incorporating:
- MQL lifestyle grade (luxury/aspirational/value_for_money) if available
- MQL age for life-stage context
- CRM occupation and family indicators
- Buying motivation`;

    // Process leads that need analysis
    const analysisPromises = leadsToAnalyze.map(async (leadWithMql: any, index: number) => {
      await new Promise((resolve) => setTimeout(resolve, index * 100));

      const { mqlEnrichment, ...lead } = leadWithMql;
      const leadDataJson = JSON.stringify(lead, null, 2);

      // Build MQL section conditionally
      const mqlAvailable = mqlEnrichment && mqlEnrichment.mql_rating && mqlEnrichment.mql_rating !== "N/A";

      let mqlSection = "";
      if (mqlAvailable) {
        mqlSection = `# MQL ENRICHMENT DATA (Verified External Data)
Rating: ${mqlEnrichment.mql_rating || "N/A"}
Capability: ${mqlEnrichment.mql_capability || "N/A"}
Lifestyle: ${mqlEnrichment.mql_lifestyle || mqlEnrichment.lifestyle || "N/A"}
Locality Grade: ${mqlEnrichment.locality_grade || "N/A"}
Age: ${mqlEnrichment.age || "N/A"}
Gender: ${mqlEnrichment.gender || "N/A"}
Designation: ${mqlEnrichment.designation || "N/A"}
Employer: ${mqlEnrichment.employer_name || "N/A"}
Annual Income (Lacs): ${mqlEnrichment.final_income_lacs || "N/A"}
Credit Score: ${mqlEnrichment.credit_score || "N/A"}
Home Loans: ${mqlEnrichment.home_loans ?? "N/A"}
Active Loans: ${mqlEnrichment.active_loans ?? "N/A"}

IMPORTANT: Derive credit_rating from credit_score: 750+ = "High", 650-749 = "Medium", <650 = "Low"`;
      } else {
        mqlSection = `# MQL DATA: Not available for this lead. Score using CRM data only. Set mql_data_available to false.`;
      }

      const brandContext = `# BRAND CONTEXT
Developer: ${brandMetadata?.developer?.name || "Unknown"}
Legacy: ${brandMetadata?.developer?.legacy || "N/A"}
Reputation: ${brandMetadata?.developer?.reputation || "N/A"}
Trust Signals: ${brandMetadata?.developer?.trust_signals?.join(", ") || "N/A"}`;

      const projectContext = `# PROJECT CONTEXT: ${projectMetadata?.project_name || project.name}

## Location
${projectMetadata?.location?.address || "N/A"}
Micro-market: ${projectMetadata?.location?.micro_market || "N/A"}
Positioning: ${projectMetadata?.location?.positioning || "N/A"}

## USPs
Primary: ${projectMetadata?.usps?.primary?.map((usp: string) => `\n- ${usp}`).join("") || "N/A"}

## Inventory Configurations
${projectMetadata?.inventory?.configurations?.map((config: any) => `- ${config.type}: ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr`).join("\n") || "N/A"}

## Common Objections & Rebuttals
${
  projectMetadata?.common_objections
    ? Object.entries(projectMetadata.common_objections)
        .map(([key, obj]: [string, any]) => `- ${key}: ${obj.rebuttal}`)
        .join("\n")
    : "N/A"
}`;

      const privacyRules = `# PRIVACY RULES (CRITICAL - NEVER VIOLATE):
1. NEVER mention credit score numbers in any output field
2. NEVER mention specific loan amounts or EMI values
3. NEVER mention card usage percentages
4. NEVER mention income figures
5. Use these values ONLY for internal scoring calculations
6. Output only derived ratings: mql_credit_rating (High/Medium/Low), mql_capability`;

      const outputConstraints = `# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Rating rationale should only focus on the overall score and reasoning. Do not specify individual dimension scores. When using dimension names, use full names instead of acronyms
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.`;

      const concernGeneration = `#Key Concerns: These must be the CUSTOMER'S concerns about the project or specific unit they are considering. Focus on: price/budget gap, location/connectivity issues, possession date/timeline, unit configuration/size, amenities/facilities. DO NOT include generic sales concerns.
- Concern Categories: For EACH key_concern, classify it into ONE of these categories (same order as key_concerns array):
  1. "Price" - Budget gaps, pricing issues, financing concerns, EMI issues
  2. "Location" - Connectivity, infrastructure, surroundings, pollution, traffic, facilities nearby
  3. "Possession" - Delivery timeline, construction delays, handover dates
  4. "Config" - Unit configuration, layout issues, view concerns, floor preference, carpet area
  5. "Amenities" - Amenities in home or complex, facilities
  6. "Trust" - Builder reputation, track record concerns
  7. "Others" - Anything else
- Primary Concern Category: The SINGLE most important concern category. If multiple concerns exist, pick the one that appears FIRST in the priority order above ( Location > Config > Price > Possession > Amenities > Trust > Others)`;

      const talkingpointsGeneration = `# TALKING POINTS GENERATION (CRITICAL - FOLLOW PRIORITY RULES):
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
- Each talking point must be max 15 words`;

      const outputStructure = `# OUTPUT STRUCTURE
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
  "rating_rationale": "PPS Score: X/100 (Rating). Brief explanation",
  "persona": "Persona label",
  "persona_description": "2-line description using CRM + MQL data",
  "summary": "2-3 sentence overview (max 30 words)",
  "key_concerns": ["concern1", "concern2"],
  "concern_categories": ["Price", "Location"],
  "primary_concern_category": "Price",
  "next_best_action": "Specific action (max 15 words)",
  "talking_points": [{"type": "What to highlight", "point": "max 15 words"}],
  "extracted_signals": {
    "budget_stated": number | null,
    "in_hand_funds": number | null,
    "finalization_timeline": "string",
    "decision_maker_present": boolean,
    "spot_closure_asked": boolean,
    "sample_feedback": "positive" | "negative" | "neutral" | "not_seen",
    "core_motivation": "string"
  },
  "mql_credit_rating": "High" | "Medium" | "Low" | null,
  "overridden_fields": [],
  "mql_data_available": ${mqlAvailable}
}`;

      const fullPrompt = `${systemPrompt}

${brandContext}

${projectContext}

${crmFieldExplainer}

${mqlAvailable ? mqlFieldExplainer : ""}

${mqlSection}

${leadScoringModel}

${personaDefinitions}

${privacyRules}

${outputConstraints}

${concernGeneration}

${talkingpointsGeneration}

# LEAD DATA TO ANALYZE
${leadDataJson}

# ANALYSIS INSTRUCTIONS
1. Read all CRM fields carefully - especially visit comments
2. If MQL data available, use it to enhance scoring per the field precedence rules
3. Calculate PPS Score using the 5-dimension framework with MQL enhancements
4. Derive credit_rating from credit_score if available: 750+ = High, 650-749 = Medium, <650 = Low
5. If CRM location differs from MQL locality_grade context, add "locality_grade" to overridden_fields
6. Generate persona using both CRM and MQL data (lifestyle, age)
7. Concerns, talking points, competitor handling: Use CRM data ONLY

${outputStructure}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
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
      const candidate = data?.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const analysisText = typeof part?.text === "string" ? part.text : JSON.stringify(candidate ?? data);

      let analysisResult;
      let parseSuccess = true;

      try {
        analysisResult = JSON.parse(analysisText);
      } catch (parseError) {
        parseSuccess = false;
        console.error("Failed to parse AI response for lead:", lead.id);

        const lower = analysisText.toLowerCase();
        let rating: "Hot" | "Warm" | "Cold" = "Warm";
        if (lower.includes("hot")) rating = "Hot";
        else if (lower.includes("cold")) rating = "Cold";

        analysisResult = {
          ai_rating: rating,
          rating_confidence: "Low",
          rating_rationale: "Analysis completed with limited structure",
          summary: analysisText.substring(0, 200),
          mql_data_available: mqlAvailable,
        };
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

    // Store results
    for (const result of freshResults) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
        if (!lead) continue;

        await supabase.from("leads").upsert(
          {
            lead_id: lead.id,
            project_id: projectId,
            crm_data: lead.rawData,
            latest_revisit_date: result.revisitDate || null,
          },
          { onConflict: "lead_id,project_id" },
        );

        await supabase.from("lead_analyses").upsert(
          {
            lead_id: lead.id,
            project_id: projectId,
            rating: result.rating,
            insights: result.insights,
            full_analysis: result.fullAnalysis,
            revisit_date_at_analysis: result.revisitDate || null,
          },
          { onConflict: "lead_id,project_id" },
        );
      }
    }

    const allResults = [...cachedResults, ...freshResults];
    const successCount = allResults.filter((r) => r.parseSuccess).length;

    console.log(`Analysis complete: ${successCount}/${allResults.length} successful`);

    return new Response(
      JSON.stringify({
        results: allResults,
        meta: {
          total: allResults.length,
          successful: successCount,
          failed: allResults.length - successCount,
          cached: cachedResults.length,
          fresh: freshResults.filter((r) => r.parseSuccess).length,
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
