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

## Employment Details (For Salaried Users)
- employer_name: Company/organization name (verified from MQL, more accurate than CRM)
- designation: Role/title (verified from MQL, more accurate than CRM)
- employment_status: "salaried", "self-employed", "contract", etc.

## Income (For Scoring Only - NEVER Mention in Output)
- final_income_lacs: Estimated annual income in Lakhs (THE ONLY income metric to use for scoring)

## Business Details (For Self-Employed/Business Owners)
- business_type: "Proprietorship", "Partnership", "Private Limited", "LLP", etc.
- industry: Derived industry/sector (e.g., "Industrial Equipment", "Textile Trading", "IT Services")
- turnover_slab: Business turnover tier - "0-40L", "40L-1.5Cr", "1.5Cr-5Cr", "5Cr-25Cr", "25Cr+"

## Credit Profile (NEVER MENTION RAW VALUES IN OUTPUT)
- credit_score: Credit score number
- Credit Rating Derivation Rules: 750+ = "High", 650-749 = "Medium", <650 = "Low"
- credit_behavior_signal: Derived pattern - "clean_credit", "active_borrower", "conservative_borrower", "credit_risk"

## Banking Loans (DETAILED - NEVER MENTION SPECIFIC VALUES IN OUTPUT)
- home_loan_count: Total housing loans ever taken
- home_loan_active: Currently active home loans
- home_loan_paid_off: Closed/paid-off home loans
- latest_home_loan_date: Date of most recent home loan sanction
- auto_loan_count: Vehicle loans
- consumer_loan_count: Personal/consumer loans
- guarantor_loan_count: Loans where person is guarantor (indicates family network/wealth)
- active_emi_burden: Total monthly EMI across all active loans
- emi_to_income_ratio: EMI burden as % of monthly income

## FIELD PRECEDENCE RULES (CRITICAL):
1. Employer Name: Use MQL value if available (verified), fallback to CRM
2. Designation: Use MQL value if available (more accurate than CRM), fallback to CRM
3. Location/Residence: ALWAYS use CRM value (customer-stated)
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
- Business Owner - Score by TURNOVER TIER (see Business Owner Scoring below): 4-12 pts
- Mid-Senior Corporate (Sr. Manager, Project Manager at IT/Banking/MNCs) OR income 15-30L: 7 pts
- Retired/Homemaker (with visible asset base): 5 pts
- Entry/Mid-Level Salaried (Sales Manager, Executive, Jr. Engineer) OR income < 15L: 4 pts
- Unknown/Unclear occupation: 2 pts

### BUSINESS OWNER SCORING (Enhanced - Turnover-Based):
If MQL business_type or turnover_slab is available:
| Turnover Slab | Base Points | Notes |
|---------------|-------------|-------|
| 25Cr+         | 12 pts      | Large enterprise, very high capability |
| 5Cr-25Cr      | 10 pts      | Mid-size business, strong capability |
| 1.5Cr-5Cr     | 8 pts       | SME, good capability |
| 40L-1.5Cr     | 6 pts       | Small business, moderate capability |
| 0-40L         | 4 pts       | Micro-business/startup |

### MARGIN-AWARE INCOME ADJUSTMENT:
When both turnover_slab and final_income_lacs are available:
- Compare MQL income with implied income from turnover (turnover * margin %)
- Typical margins: Trading 5-8%, Manufacturing 10-15%, Services 20-30%, IT 25-40%
- If GST-implied income > MQL income by 50%+: Add +2-3 pts capability uplift
- NEVER discount MQL income estimate - only uplift if GST data suggests higher capability

### A2. Budget Gap Ratio (10 pts):
Calculate gap = (Unit Price - Stated Budget) / Unit Price * 100

WITHOUT MQL DATA (Standard Gap Calculation):
- Negative gap (Budget > Price): 10 pts
- Gap 0-10%: 8 pts
- Gap 10-20%: 5 pts
- Gap 20-30%: 3 pts
- Gap > 30% or Budget not stated: 1 pt

WITH MQL DATA (Enhanced Scoring):
- MQL capability "high" + Budget matches: 10 pts
- MQL capability "medium" + Budget matches: 8 pts
- MQL capability "low": Cap at 5 pts regardless of stated budget

### A3. Source of Funds Liquidity (10 pts):
Factor in MQL credit_rating, credit_behavior_signal, and emi_to_income_ratio:
- Self-Funding + High Credit Rating + credit_behavior = "clean_credit": 10 pts
- Self-Funding + Medium Credit Rating: 9 pts
- Loan + High Credit Rating + emi_to_income_ratio < 30%: 8 pts
- Loan + Medium Credit Rating + emi_to_income_ratio < 50%: 6 pts
- Loan + emi_to_income_ratio > 50% (HIGH EMI BURDEN): 3 pts (PENALIZE)
- Loan + emi_to_income_ratio 30-50% (MODERATE STRESS): 5 pts (-2 pts penalty)
- Loan + Low Credit Rating OR credit_behavior = "credit_risk": 4 pts
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
If MQL home_loan_count > 0: +2 bonus (indicates active property buyer/investor)
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
Factor in MQL age and loan history for life-stage signals:
- Currently on rent: 10 pts
- Marriage/Relocation trigger: 10 pts
- MQL age 55+ (retirement planning): +2 bonus
- Home loan sanctioned in last 3 years AND active: -3 pts (unlikely to buy again soon)
  - EXCEPTION: If home_loan_active >= 2: Override penalty → Investor signal +5 pts
- Home loan paid off 5+ years ago: +3 pts (Upgrade buyer ready)
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

Factor in MQL age and guarantor_loan_count:
- guarantor_loan_count > 0: +1 pt (indicates family wealth/network)
- MQL age 55+: Likely self-decision (+2 pts)
- MQL age 25-34: May need family consultation (-1 pt)
- All decision makers present: 10 pts
- Partial DM: 5 pts
- Proxy visit: 2 pts

## SPECIAL SIGNALS & MULTIPLIERS:
- Biophilic Buyer: +3 to PMF
- Business Owner with turnover 5Cr+: Already captured in A1 scoring
- Existing brand customer: +5 to IE
- Investment-only with low budget: Cap at 40
- Strong competitor preference with booking: -10
- Multiple active home loans (2+): Investor persona, adjust scoring per rules above`;

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
Detection: Occupation = "Retired" OR Designation mentions "Retired" OR MQL age >= 55
Characteristics:
- Often selling existing property (SOP funding)
- Values greenery, open spaces, healthcare proximity
- Prefers ground/lower floors for accessibility
- Budget typically from accumulated savings + SOP

### 3. Business Owner
Detection: Occupation = "Business" OR "Self-Employed" OR Designation contains "Owner"/"Proprietor"/"Director" (non-corporate) OR MQL business_type is populated
Characteristics:
- Self-funding capability (cash-rich, especially high turnover tiers)
- Prefers premium/exclusive units
- May want multiple units (investment angle)
- Flexible on timing, decisive when interested
- If turnover_slab available, mention scale (SME/Mid-size/Large enterprise) in persona description

### 4. Investor
Detection: Comments mention "investment"/"rental income"/"tax saving"/"appreciation" OR Purpose = Investment OR home_loan_active >= 2 (multiple property owner)
Characteristics:
- Prefers smaller units (1-2 BHK) for rental yield
- Focuses on ROI, rental potential, appreciation
- May not visit site personally
- Price-sensitive, compares multiple options

### 5. Upgrade Seeker
Detection: Building Name is populated (currently owns/rents) AND shows indicators of wanting larger/better home OR (home_loan_paid_off > 0 AND latest_home_loan_date is 5+ years ago)
Characteristics:
- Currently owns/rents smaller home
- Family growing or lifestyle upgrade needed
- Budget typically 1.5-2x current home value
- Compares amenities and space improvements

### 6. First-Time Buyer
Detection: Building Name is empty/unclear AND Source of Funding = Loan AND no prior property ownership indicated AND home_loan_count = 0
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

## PERSONA DESCRIPTION INSTRUCTIONS (CRITICAL - FOLLOW EXACTLY):
The persona_description should be a 2-line description that focuses ONLY on:
1. DEMOGRAPHICS: Age, gender, family composition (use MQL age/gender if available)
2. FINANCIAL/PROFESSIONAL PROFILE: Occupation, designation, income capability, lifestyle grade (luxury/aspirational/value_for_money)
   - For Business Owners: Include business type (Proprietorship/Company) and industry if available, but NEVER mention GST numbers or business names
   - For Business Owners: Mention turnover scale abstractly (e.g., "mid-size industrial equipment business" not "turnover 1.5Cr-5Cr")
3. PRIMARY BUYING MOTIVATION: Why they are looking to buy (upgrade, first home, investment, retirement, relocation, etc.)

DO NOT include in persona_description:
- Visit details or visit experience
- Property preferences (size, floor, facing)
- Concerns or objections
- Timeline or decision factors
- GST numbers, business names, or specific financial figures
These belong in the Summary section, not here.`;

    // Build competitor pricing matrix from project metadata
    const competitors = projectMetadata?.competitors || {};
    let competitorPricingMatrix = `# COMPETITOR PRICING REFERENCE (For Talking Points)\n\n`;
    competitorPricingMatrix += `| Competitor | Config | Carpet Sqft | Price Range | Possession | Notes |\n`;
    competitorPricingMatrix += `|------------|--------|-------------|-------------|------------|-------|\n`;
    
    for (const [compName, compData] of Object.entries(competitors)) {
      const comp = compData as any;
      const inventory = comp.inventory_sold || comp.inventory || [];
      for (const inv of inventory) {
        competitorPricingMatrix += `| ${compName} | ${inv.config || 'N/A'} | ${inv.carpet_sqft || 'N/A'} | ₹${inv.price_range || 'N/A'} | ${inv.possession || comp.possession || 'N/A'} | ${inv.notes || ''} |\n`;
      }
    }
    
    // Add Eternia inventory for comparison
    const eterniaInventory = projectMetadata?.inventory?.configurations || [];
    competitorPricingMatrix += `\n## ETERNIA INVENTORY (For Comparison):\n`;
    for (const config of eterniaInventory) {
      competitorPricingMatrix += `- ${config.type}: ${config.carpet_sqft_range?.[0]}-${config.carpet_sqft_range?.[1]} sqft, ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr, Target: ${config.target_persona || 'N/A'}\n`;
    }

    // Process leads that need analysis
    const analysisPromises = leadsToAnalyze.map(async (leadWithMql: any, index: number) => {
      await new Promise((resolve) => setTimeout(resolve, index * 100));

      const { mqlEnrichment, ...lead } = leadWithMql;
      const leadDataJson = JSON.stringify(lead, null, 2);

      // Build MQL section conditionally with enhanced fields
      const mqlAvailable = mqlEnrichment && mqlEnrichment.mql_rating && mqlEnrichment.mql_rating !== "N/A";

      let mqlSection = "";
      if (mqlAvailable) {
        // Calculate years since latest home loan
        let homeLoanRecency = "N/A";
        if (mqlEnrichment.latest_home_loan_date) {
          const loanDate = new Date(mqlEnrichment.latest_home_loan_date);
          const yearsSinceLoan = (Date.now() - loanDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          homeLoanRecency = yearsSinceLoan < 3 ? "Within 3 years" : yearsSinceLoan < 5 ? "3-5 years ago" : "5+ years ago";
        }
        
        // Extract employment status from raw response if available
        const rawLeadData = mqlEnrichment.raw_response?.leads?.[0] || {};
        const employmentDetails = rawLeadData.employment_details || [];
        const primaryEmployment = employmentDetails[0] || {};
        const employmentStatus = primaryEmployment.employment_status || primaryEmployment.status || "N/A";
        
        mqlSection = `# MQL ENRICHMENT DATA (Verified External Data)

## Basic Profile
Rating: ${mqlEnrichment.mql_rating || "N/A"}
Capability: ${mqlEnrichment.mql_capability || "N/A"}
Lifestyle: ${mqlEnrichment.mql_lifestyle || mqlEnrichment.lifestyle || "N/A"}
Locality Grade: ${mqlEnrichment.locality_grade || "N/A"}
Age: ${mqlEnrichment.age || "N/A"}
Gender: ${mqlEnrichment.gender || "N/A"}

## Employment Details (For Salaried Users)
Employer Name: ${mqlEnrichment.employer_name || "N/A"}
Designation: ${mqlEnrichment.designation || "N/A"}
Employment Status: ${employmentStatus}

## Income (For Scoring Only - NEVER Mention in Output)
Annual Income (Lacs): ${mqlEnrichment.final_income_lacs || "N/A"}

## Business Details (For Self-Employed - For Scoring Only - NEVER Mention Specific Values)
Business Type: ${mqlEnrichment.business_type || "N/A"}
Industry: ${mqlEnrichment.industry || "N/A"}
Turnover Slab: ${mqlEnrichment.turnover_slab || "N/A"}

## Credit Profile (For Scoring Only - NEVER Mention in Output)
Credit Score: ${mqlEnrichment.credit_score || "N/A"}
Credit Behavior: ${mqlEnrichment.credit_behavior_signal || "N/A"}

## Loan History (For Scoring Only - NEVER Mention Specific Values)
Home Loans - Total: ${mqlEnrichment.home_loan_count ?? "N/A"}, Active: ${mqlEnrichment.home_loan_active ?? "N/A"}, Paid Off: ${mqlEnrichment.home_loan_paid_off ?? "N/A"}
Latest Home Loan: ${homeLoanRecency}
Auto Loans: ${mqlEnrichment.auto_loan_count ?? "N/A"}
Consumer/Personal Loans: ${mqlEnrichment.consumer_loan_count ?? "N/A"}
Guarantor Loans: ${mqlEnrichment.guarantor_loan_count ?? "N/A"}

## EMI Burden (For Scoring Only - NEVER Mention Specific Values)
Active EMI Burden (Monthly): ${mqlEnrichment.active_emi_burden ? `₹${mqlEnrichment.active_emi_burden}` : "N/A"}
EMI-to-Income Ratio: ${mqlEnrichment.emi_to_income_ratio ? `${mqlEnrichment.emi_to_income_ratio.toFixed(1)}%` : "N/A"}

## Credit Cards
Card Count: ${mqlEnrichment.credit_card_count ?? "N/A"}
Has Premium Cards (Amex/Platinum): ${mqlEnrichment.has_premium_cards ? "Yes" : "No"}

IMPORTANT SCORING RULES:
1. Derive credit_rating from credit_score: 750+ = "High", 650-749 = "Medium", <650 = "Low"
2. For Business Owners: Use turnover_slab for A1 scoring (see BUSINESS OWNER SCORING table)
3. If GST-implied income (based on turnover tier) > MQL income by 50%+: Apply +2-3 pts capability uplift
4. EMI Burden Penalty: If emi_to_income_ratio > 50%: -5 pts to A3. If 30-50%: -2 pts to A3
5. Home Loan Timeline: If latest_home_loan within 3 years AND active: -3 pts to C2 UNLESS home_loan_active >= 2 (Investor: +5 pts instead)
6. Guarantor Signal: If guarantor_loan_count > 0: +1 pt to E`;
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
Walk-to-Work Employers: ${projectMetadata?.location?.walk_to_work_employers?.join(", ") || "N/A"}
Medical Hub: ${projectMetadata?.location?.medical_hub?.join(", ") || "N/A"}

## Township Features
${
  projectMetadata?.township
    ? `Name: ${projectMetadata.township.name || "N/A"}
Total Area: ${projectMetadata.township.total_area_acres || "N/A"} acres
Grand Central Park: ${projectMetadata.township.grand_central_park?.area_acres || "N/A"} acres with ${projectMetadata.township.grand_central_park?.trees || "N/A"} trees
Open Space: ${projectMetadata.township.open_space_percent || "N/A"}%
Vehicle-Free Podium: ${projectMetadata.township.podium_acres || "N/A"} acres`
    : "N/A"
}

## USPs
Primary: ${projectMetadata?.usps?.primary?.map((usp: string) => `\n- ${usp}`).join("") || "N/A"}
Construction Quality: ${projectMetadata?.usps?.construction_quality?.map((qual: string) => `\n- ${qual}`).join("") || "N/A"}

## Project DNA
Architectural Partner: ${projectMetadata?.project_dna?.architect || "N/A"}
Landscape Partner: ${projectMetadata?.project_dna?.landscape || "N/A"}
Layout Philosophy: ${projectMetadata?.project_dna?.layout_philosophy || "N/A"}

## Inventory Configurations
${
  projectMetadata?.inventory?.configurations
    ?.map(
      (config: any) =>
        `- ${config.type}: ${config.carpet_sqft_range?.[0] || "N/A"}-${config.carpet_sqft_range?.[1] || "N/A"} sqft, ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr
  Target: ${config.target_persona || "N/A"}
  Notes: ${config.notes || "N/A"}`,
    )
    .join("\n") || "N/A"
}

## Common Objections & Rebuttals
${
  projectMetadata?.common_objections
    ? Object.entries(projectMetadata.common_objections)
        .map(([key, obj]: [string, any]) => `- ${key}: ${obj.objection || "N/A"}\n  Rebuttal: ${obj.rebuttal}`)
        .join("\n")
    : "N/A"
}`;

      const privacyRules = `# PRIVACY RULES (CRITICAL - NEVER VIOLATE):
1. NEVER mention credit score numbers in any output field
2. NEVER mention specific loan amounts, EMI values, or emi_to_income_ratio percentages
3. NEVER mention card usage percentages or card limits
4. NEVER mention income figures (final_income_lacs, pre_tax_income)
5. NEVER mention turnover slab numbers directly (use abstract descriptions like "mid-size business")
6. NEVER mention GST numbers or business names
7. Use these values ONLY for internal scoring calculations
8. Output only derived ratings: mql_credit_rating (High/Medium/Low), mql_capability
9. For Business Owners: Describe scale abstractly (e.g., "established manufacturing business" not "turnover 5Cr-25Cr")`;

      const outputConstraints = `# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Rating rationale should start with "**PPS Score: X/100.**" in bold, followed by key scoring factors. Do NOT include rating label like "(Hot)" or "(Warm)" in the rationale - that's shown separately
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
- Use BOTH qualitative AND quantitative comparisons when data is available
- Include specific metrics from the COMPETITOR PRICING REFERENCE: price-per-sqft, carpet area comparison, possession timeline
- Format examples:
  - "Eternia 3BHK offers 20% more carpet area (1100 vs 918 sqft) at competitive ₹/sqft"
  - "Amara possession is 2026; Eternia Phase 1 matches with added 250-acre park premium"
  - "Godrej Ascend 3BHK at 855 sqft vs Eternia Large 3BHK at 1100+ sqft - 30% more space"
- Each point max 15 words
- Topic type: "Competitor handling"

FOR RTMI (Ready-to-Move-In) SEEKERS:
- Check which competitors offer earlier possession from COMPETITOR PRICING REFERENCE
- Acknowledge the timeline gap honestly
- Highlight why Eternia is worth the wait: park ecosystem, township moat, layout efficiency, construction quality
- Example: "Amara is RTMI but Eternia's 250-acre park ecosystem adds long-term value premium"

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

${competitorPricingMatrix}`;

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
  "rating_rationale": "**PPS Score: X/100.** Brief explanation of key scoring factors without rating label",
  "persona": "Persona label",
  "persona_description": "2-line description focusing on: (1) demographics - age, gender, family composition; (2) financial/professional profile - occupation, designation, income capability; (3) primary buying motivation. For business owners, mention scale abstractly (e.g., 'established manufacturing business') without specific turnover figures. DO NOT include visit details, property preferences, or concerns here.",
  "summary": "Summarize the lead's visit notes: what they are looking for, visit experience/feedback, decision factors and timelines mentioned. DO NOT repeat demographic or professional details. Max 30 words.",
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
  "mql_emi_burden": "Low" | "Moderate" | "High" | null,
  "mql_investor_signal": boolean,
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
1. Read all fields carefully - especially visit comments which contain the richest data.
2. Extract structured information (Budget, In-hand funds, Finalization time, etc.)
3. Calculate the PPS Score using the 5-dimension framework:
   - Score Financial Capability (A1 + A2 + A3, max 30)
     - For Business Owners: Use TURNOVER TIER scoring table
     - Apply margin-aware income adjustment if GST-implied income > MQL income by 50%+
   - Score Intent & Engagement (B1 + B2 + B3, max 25)
   - Score Urgency & Timeline (C1 + C2, max 20)
     - Apply home loan timeline rules: recent active loan = -3 pts (unless 2+ active = investor +5 pts)
   - Score Product-Market Fit (D1 + D2, max 15)
   - Score Authority & Decision Dynamics (max 10)
     - Add +1 pt if guarantor_loan_count > 0
   - Apply EMI burden penalty to A3: >50% = -5 pts, 30-50% = -2 pts
   - Apply special multipliers if applicable
   - Sum all dimensions for total PPS (0-100)
4. If MQL data available, use it to enhance scoring per the field precedence rules
5. Derive credit_rating from credit_score if available: 750+ = High, 650-749 = Medium, <650 = Low
6. Derive mql_emi_burden: <30% = Low, 30-50% = Moderate, >50% = High
7. Set mql_investor_signal = true if home_loan_active >= 2
8. If CRM location differs from MQL locality_grade context, add "locality_grade" to overridden_fields
9. Identify persona using the Persona Identification Guide - check detection rules in priority order (NRI > Retirement > Business Owner > Investor > Upgrade Seeker > First-Time Buyer > Fallback Custom)
10. Generate a 2-line persona_description that captures occupation, lifestyle, family situation, and buying motivation - must align with selected persona. For Business Owners, describe scale abstractly without specific figures.
11. Concerns, talking points, competitor handling: Use CRM data ONLY
12. For competitor talking points: Use BOTH qualitative AND quantitative comparisons from COMPETITOR PRICING REFERENCE
13. Create actionable next steps and talking points

${outputStructure}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            tools: [{ google_search: {} }],
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

    // Store analysis results (leads are already stored during file upload)
    for (const result of freshResults) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
        if (!lead) continue;

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
