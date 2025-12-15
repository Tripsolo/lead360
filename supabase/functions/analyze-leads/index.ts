import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background task processing
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= STAGE 1: Signal Extraction =============
function buildStage1Prompt(
  leadDataJson: string,
  mqlSection: string,
  mqlAvailable: boolean,
  crmFieldExplainer: string,
  mqlFieldExplainer: string,
): string {
  const extractionSystemPrompt = `You are a data extraction specialist for real estate CRM and lead enrichment data. Your task is to extract structured signals from raw CRM and MQL data accurately and completely.

Focus on:
- Extracting factual information from structured fields
- Parsing unstructured visit comments for key data points
- Transforming raw values into categorical signals for privacy
- Identifying all relevant signals for lead scoring
- Capturing DIRECT QUOTES and SPECIFIC FACTS as evidence for downstream analysis`;

  const extractionInstructions = `# EXTRACTION TASK

Extract structured signals from the CRM and MQL data provided. Transform raw values into categorical signals where specified.

## CRITICAL TRANSFORMATIONS:
1. credit_score → credit_rating: 750+ = "High", 650-749 = "Medium", <650 = "Low", null = null
2. emi_to_income_ratio → emi_burden_level: <30% = "Low", 30-50% = "Moderate", >50% = "High", null = null
3. home_loan_active >= 2 → investor_signal: true
4. Parse visit_comments for: budget, in-hand funds %, finalization timeline, spot closure response, sample feedback, core motivation
5. Summarize all visit notes into a concise 30-word summary

## FIELD PRECEDENCE RULES:
- Employer Name: Use MQL value if available, else CRM
- Designation: Use MQL value if available, else CRM
- Location/Residence: ALWAYS use CRM value
- Age/Gender: Use MQL value if available

## FIELD EXTRACTION RULES:

### Demographics & Family:
1. income_earners: Count earning members mentioned ("both working" = 2, "single income" = 1, "wife also working" = 2)
2. years_at_current_residence: Parse from comments if mentioned ("staying here for 5 years" = 5)
3. family_size: Extract total family members ("family of 4" = 4, "couple with 2 kids" = 4, "nuclear family" = 4, "joint family" = 6)
4. children_count: Extract from comments ("2 kids" = 2, "son and daughter" = 2, "school-going" implies children)
5. children_ages: Extract age references as array ("kids 8 and 12" = ["8", "12"], "teenager" = ["13-19"], "toddler" = ["1-3"])

### Property & Current Residence:
6. current_carpet_sqft: Parse from these patterns (prioritize in order):
   - "current flat is X sqft" or "current X sqft"
   - "currently living in X carpet"
   - "X sqft 2BHK/3BHK" in context of current residence
   - "currently owns X sqft"
   - If rented, extract landlord flat size if mentioned
   - Convert to carpet: if "built-up" mentioned, multiply by 0.75
7. upgrade_ratio: Calculate as carpet_area_desired / current_carpet_sqft (if both available, round to 1 decimal)
8. specific_unit_interest: Extract from:
   - CRM field "Interested Tower" + "Floor" (e.g., "Tower A, 15th floor" → "A-15")
   - CRM field "Interested Unit" if contains unit number
   - Visit comments: patterns like "A-1502", "B-2304", "unit 1502", "flat 15-02"
   - Comments like "liked 15th floor unit", "showed B wing 23rd floor"
   Return as array: ["A-1502", "B-2304"] or null if none found

### Engagement & Timeline:
9. expected_closure_days: Parse timelines ("next week" = 7, "this month" = 30, "within 2-3 months" = 75, "by end of year" = 180)
10. possession_urgency: Extract possession expectations ("need by Dec 2026", "want RTMI", "can wait 2 years")
11. search_duration_months: Calculate from "Searching Property since" CRM field:
    - "1 - 6 Months" → 3 (midpoint)
    - "6 Months - 1 Year" → 9
    - "More Than 1 Year" → 15
    - "Blank" or null → null
12. visit_quality: Assess from visit comments:
    - "Thorough": Saw sample flat, discussed pricing, met decision-makers
    - "Standard": Normal site visit without issues
    - "Rushed": "in a hurry", "didn't have time", "quick visit"
    - "Issues": "lift wasn't working", "sample not ready", "site messy"
13. revisit_promised: Extract explicit revisit commitment ("will come back" = true, "revisit next week" = true, "coming with family" = true)

### Financial (from MQL banking_loans):
14. joint_loan_count: Count loans from MQL banking_loans where ownership_type = "Joint Account"
15. guarantor_loan_count: Count loans from MQL banking_loans where ownership_type = "Guarantor"
16. total_collateral_value_cr: Sum collateral_value from MQL banking_loans where loan is secured, convert to Crores
17. total_active_emi_monthly: Sum installment_amount from MQL banking_loans where loan is active
18. education_loan_present: Check if any loan in MQL banking_loans has account_type containing "education" or "student"

### Negotiation & Objections:
19. negotiation_asks: Extract discount/freebie requests as array ("asking for 5L discount", "wants free parking", "needs stamp duty waiver")
20. non_booking_reason: Extract from (first available wins):
    - CRM field "Why Not Booked Today"
    - CRM field "Reason for not booking on SPOT"
    - Visit comments containing "didn't book because", "not booked as", "couldn't book due to"
    Categorize as: "Price Negotiation" | "Family Consultation" | "Financing Pending" | "Competitor Comparison" | "Configuration Mismatch" | "Possession Timeline" | "Other"

### Cards & Lifestyle:
21. card_portfolio_strength: "Premium" if Amex/Diners or has_premium_cards=true, "Standard" if 2+ cards, "Basic" otherwise
22. roots_feedback: Extract specific feedback about the park/township ("loved the park", "roots seems too far")

### Competitor Intelligence (Enhanced):
23. competitors_mentioned: Parse competitor details with pricing:
    - Pattern: "Runwal Land Ends/1100sq ft/270 lacs" → carpet_stated: 1100, price_stated_cr: 2.7
    - Calculate price_per_sqft: (price_stated_cr * 10000000) / carpet_stated
    - Pattern: "L&T quoted 18000/sqft" → price_per_sqft: 18000
    - Pattern: "Rustomjee 2.1Cr for similar" → price_stated_cr: 2.1
    - advantage_stated: What customer said is better ("better possession", "more carpet")

## EVIDENCE EXTRACTION RULES (CRITICAL):
- Use DIRECT QUOTES from Visit Comments where possible (wrap in quotes)
- Include SPECIFIC NUMBERS mentioned (budget figures, carpet areas, price comparisons)
- Capture CUSTOMER'S OWN WORDS for motivations and objections
- For sample_response_quote, capture exact feedback about sample flat visit
- For competitor_comparison_quote, capture exact price/feature comparisons stated by customer
- If no evidence available for a field, set to null (NEVER fabricate quotes or facts)
- Evidence sections ground the Stage 2 outputs in real data, preventing hallucination`;

  const extractionOutputSchema = `# EXTRACTION OUTPUT STRUCTURE
Return a JSON object with this EXACT structure:
{
  "demographics": {
    "age": number | null,
    "gender": "Male" | "Female" | null,
    "family_stage": "Single" | "Young Couple" | "Growing Family" | "Mature Family" | "Empty Nest" | "Retired" | null,
    "nri_status": boolean,
    "residence_location": "string",
    "building_name": "string | null",
    "locality_grade": "Premium" | "Popular" | "Affordable" | null,
    "income_earners": number | null,
    "years_at_current_residence": number | null,
    "family_size": number | null,
    "children_count": number | null,
    "children_ages": ["string"] | null
  },
  "professional_profile": {
    "occupation_type": "Salaried" | "Business" | "Self-Employed" | "Professional" | "Retired" | "Homemaker" | null,
    "designation": "string | null",
    "employer": "string | null",
    "industry": "string | null",
    "business_type": "string | null",
    "turnover_tier": "0-40L" | "40L-1.5Cr" | "1.5Cr-5Cr" | "5Cr-25Cr" | "25Cr+" | null,
    "work_location": "string | null",
    "company_type": "MNC" | "Indian Corporate" | "SME" | "Startup" | "Government" | "PSU" | null
  },
  "financial_signals": {
    "budget_stated_cr": number | null,
    "in_hand_funds_pct": number | null,
    "funding_source": "Self-Funding" | "Loan" | "Sale of Asset" | "Subvention Loan" | "Mixed" | null,
    "income_tier": "Elite" | "High" | "Mid-Senior" | "Entry-Mid" | null,
    "credit_rating": "High" | "Medium" | "Low" | null,
    "emi_burden_level": "Low" | "Moderate" | "High" | null,
    "mql_capability": "high" | "medium" | "low" | null,
    "mql_lifestyle": "luxury" | "aspirational" | "value_for_money" | null,
    "investor_signal": boolean,
    "home_loan_recency": "Within 3 years" | "3-5 years ago" | "5+ years ago" | "No loans" | null,
    "home_loan_count": number | null,
    "home_loan_active": number | null,
    "home_loan_paid_off": number | null,
    "guarantor_loan_count": number | null,
    "joint_loan_count": number | null,
    "total_collateral_value_cr": number | null,
    "total_active_emi_monthly": number | null,
    "education_loan_present": boolean,
    "stated_family_income_lpa": number | null,
    "card_portfolio_strength": "Premium" | "Standard" | "Basic" | null,
    "auto_loan_count": number | null,
    "consumer_loan_count": number | null,
    "credit_history_years": number | null
  },
  "property_preferences": {
    "config_interested": "string",
    "carpet_area_desired": "string | null",
    "floor_preference": "string | null",
    "stage_preference": "Launch" | "Under Construction" | "Nearing Completion" | "RTMI" | null,
    "facing_preference": "string | null",
    "current_carpet_sqft": number | null,
    "upgrade_ratio": number | null,
    "specific_unit_interest": ["string"] | null,
    "alternative_shown": "string | null"
  },
  "engagement_signals": {
    "visit_count": number,
    "days_since_last_visit": number | null,
    "is_duplicate_lead": boolean,
    "sample_feedback": "positive" | "negative" | "neutral" | "not_seen",
    "decision_makers_present": "All" | "Partial" | "Proxy" | null,
    "spot_closure_asked": boolean,
    "finalization_timeline": "string | null",
    "searching_since": "string | null",
    "possession_urgency": "string | null",
    "expected_closure_days": number | null,
    "search_duration_months": number | null,
    "visit_quality": "Thorough" | "Standard" | "Rushed" | "Issues" | null,
    "revisit_promised": boolean,
    "non_booking_reason": "string | null",
    "roots_feedback": "string | null",
    "negotiation_asks": ["string"] | null
  },
  "concerns_extracted": [
    { "topic": "Price" | "Location" | "Possession" | "Config" | "Amenities" | "Trust" | "Others", "detail": "string" }
  ],
  "competitor_intelligence": {
    "competitors_mentioned": [
      { 
        "name": "string", 
        "project": "string | null", 
        "visit_status": "Yet to Visit" | "Already Visited" | "Booked" | null, 
        "carpet_stated": number | null,
        "price_stated_cr": number | null,
        "price_per_sqft": number | null,
        "advantage_stated": "string | null" 
      }
    ],
    "alternative_if_not_kl": "string | null",
    "lost_to_competitor": "string | null"
  },
  "historical_signals": {
    "existing_kalpataru_property": "string | null",
    "referral_source": "string | null",
    "previous_enquiry_project": "string | null"
  },
  "lifestyle_signals": {
    "lifestyle_activities": ["string"] | null,
    "car_ownership": "string | null",
    "travel_profile": "string | null"
  },
  "core_motivation": "string describing primary buying motivation",
  "visit_notes_summary": "30-word summary of visit experience and feedback",
  "brand_loyalty": boolean,
  "mql_data_available": ${mqlAvailable},
  
  "demographics_evidence": {
    "family_composition": "string | null",
    "current_home_details": "string | null",
    "lifestyle_context": "string | null"
  },
  "professional_evidence": {
    "role_context": "string | null",
    "work_location_detail": "string | null"
  },
  "financial_evidence": {
    "stated_budget_quote": "string | null",
    "funding_plan_detail": "string | null",
    "income_context": "string | null"
  },
  "preferences_evidence": {
    "sample_response_quote": "string | null",
    "comparison_to_current": "string | null",
    "unit_discussion": "string | null"
  },
  "engagement_evidence": {
    "first_visit_summary": "string | null",
    "latest_visit_summary": "string | null",
    "objection_stated": "string | null",
    "next_steps_stated": "string | null"
  },
  "competitor_evidence": {
    "competitor_comparison_quote": "string | null",
    "preference_reasoning": "string | null"
  },
  "motivation_evidence": {
    "stated_motivation_quote": "string | null",
    "upgrade_drivers": "string | null",
    "location_pull": "string | null"
  }
}`;

  return `${extractionSystemPrompt}

${crmFieldExplainer}

${mqlAvailable ? mqlFieldExplainer : ""}

${mqlSection}

# LEAD DATA TO EXTRACT FROM
${leadDataJson}

${extractionInstructions}

${extractionOutputSchema}`;
}

// ============= STAGE 2: Scoring & Generation =============
function buildStage2Prompt(
  extractedSignalsJson: string,
  systemPrompt: string,
  brandContext: string,
  projectContext: string,
  leadScoringModel: string,
  personaDefinitions: string,
  privacyRules: string,
  outputConstraints: string,
  concernGeneration: string,
  talkingpointsGeneration: string,
  outputStructure: string,
): string {
  const stage2Instructions = `# ANALYSIS INSTRUCTIONS

You are provided with PRE-EXTRACTED SIGNALS from CRM and MQL data (not raw data). Use these signals to:

1. Calculate the PPS Score using the 5-dimension framework:
   - Financial Capability (max 30 pts): Use income_tier, turnover_tier, budget gap, funding_source, credit_rating, emi_burden_level, card_portfolio_strength, total_collateral_value_cr
   - Intent & Engagement (max 25 pts): Use visit_count, is_duplicate_lead, sample_feedback, competitor_intelligence, roots_feedback, visit_quality, revisit_promised
   - Urgency & Timeline (max 20 pts): Use stage_preference, core_motivation, home_loan_recency, investor_signal, possession_urgency, expected_closure_days, search_duration_months
   - Product-Market Fit (max 15 pts): Use config match, location fit, mql_lifestyle alignment, upgrade_ratio, family_size, children_count
   - Authority & Decision Dynamics (max 10 pts): Use decision_makers_present, age-based adjustments, guarantor_loan_count, joint_loan_count, income_earners

2. Apply scoring adjustments from extracted signals:
   - If investor_signal is true: +5 pts to Urgency
   - If home_loan_recency is "Within 3 years" AND investor_signal is false: -3 pts to Urgency
   - If emi_burden_level is "High": -5 pts to Financial. If "Moderate": -2 pts
   - If guarantor_loan_count > 0: +1 pt to Authority (family network signal)
   - If joint_loan_count > 0: +1 pt to Authority (family decision-making)
   - If card_portfolio_strength is "Premium": +2 pts to Financial
   - If upgrade_ratio > 1.5: +2 pts to Product-Market Fit (significant upgrade)
   - If total_collateral_value_cr >= 1: +2 pts to Financial (asset-backed strength)
   - If children_count > 0 AND project has school proximity: +2 pts to PMF
   - If family_size >= 5 AND config is 3BHK+: +1 pt to PMF (config match)
   - If search_duration_months > 12: +3 pts to Urgency (serious buyer, extended search)
   - If search_duration_months 6-12: +1 pt to Urgency (active search)
   - If visit_quality is "Thorough": +2 pts to Intent
   - If visit_quality is "Rushed" or "Issues": -2 pts to Intent
   - If revisit_promised is true: +2 pts to Intent

3. Derive final rating from PPS: >= 85 = Hot, >= 65 = Warm, < 65 = Cold

4. Identify persona using detection rules in priority order (NRI > Retirement > Business Owner > Investor > Upgrade Seeker > First-Time Buyer > Custom)

5. Generate outputs using ONLY the extracted signals - do NOT hallucinate additional information

6. For competitor talking points: Use COMPETITOR PRICING REFERENCE with quantitative comparisons
   - Use competitor carpet_stated, price_stated_cr, and price_per_sqft for specific comparisons
   - Calculate differentials: "X% more carpet area at competitive pricing"

## USING EXTRACTED EVIDENCE IN OUTPUTS (CRITICAL)

When generating persona_description, summary, and talking_points, reference the evidence sections:

1. **PERSONA DESCRIPTION**: Reference demographics_evidence and professional_evidence
   - Use family_composition for family stage context (e.g., "Couple with two school-going kids")
   - Use role_context for professional credibility (e.g., "Senior Manager at TCS with 15+ years experience")
   - Use lifestyle_context for lifestyle tier

2. **SUMMARY**: Reference engagement_evidence and motivation_evidence
   - Use first_visit_summary and latest_visit_summary for visit chronology
   - Use stated_motivation_quote for core intent (use customer's own words when available)
   - Use next_steps_stated for follow-up context

3. **TALKING POINTS**: Reference preferences_evidence and competitor_evidence
   - Use sample_response_quote for positive reinforcement points
   - Use competitor_comparison_quote for specific counter-comparisons
   - Use comparison_to_current for upgrade value proposition

4. **CONCERNS**: Reference engagement_evidence.objection_stated
   - Use direct customer words when available for accurate concern capture

5. **NEXT BEST ACTION**: Reference engagement_evidence.next_steps_stated and negotiation_asks
   - Tailor action based on stated next steps and any negotiation requests

CRITICAL: Do not fabricate quotes or facts. Only use evidence that is present (not null). If evidence is null, generate based on signals only.`;

  return `${systemPrompt}

${brandContext}

${projectContext}

${leadScoringModel}

${personaDefinitions}

${privacyRules}

${outputConstraints}

${concernGeneration}

${talkingpointsGeneration}

# PRE-EXTRACTED SIGNALS (Use these for analysis - NOT raw data)
${extractedSignalsJson}

${stage2Instructions}

${outputStructure}`;
}

// ============= Gemini API Call Helper =============
async function callGeminiAPI(
  prompt: string,
  googleApiKey: string,
  useJsonMode: boolean = true,
  maxRetries: number = 3,
): Promise<string> {
  let lastError: Error | null = null;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const generationConfig: any = {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      };

      if (useJsonMode) {
        generationConfig.responseMimeType = "application/json";
      }

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        break;
      }

      const errorText = await response.text();

      if (response.status === 503 && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Google AI API overloaded (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("Google AI API error:", errorText);
      lastError = new Error(`API call failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Fetch error (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  if (!response?.ok) {
    throw lastError || new Error("API call failed after retries");
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  return typeof part?.text === "string" ? part.text : JSON.stringify(candidate ?? data);
}

// ============= Fallback Extraction =============
function createFallbackExtraction(lead: any, mqlEnrichment: any): any {
  const rawData = lead.rawData || {};
  const mqlAvailable = mqlEnrichment && mqlEnrichment.mql_rating && mqlEnrichment.mql_rating !== "N/A";

  // Calculate credit rating from MQL
  let creditRating = null;
  if (mqlEnrichment?.credit_score) {
    if (mqlEnrichment.credit_score >= 750) creditRating = "High";
    else if (mqlEnrichment.credit_score >= 650) creditRating = "Medium";
    else creditRating = "Low";
  }

  // Calculate EMI burden level
  let emiBurdenLevel = null;
  if (mqlEnrichment?.emi_to_income_ratio !== null && mqlEnrichment?.emi_to_income_ratio !== undefined) {
    if (mqlEnrichment.emi_to_income_ratio < 30) emiBurdenLevel = "Low";
    else if (mqlEnrichment.emi_to_income_ratio <= 50) emiBurdenLevel = "Moderate";
    else emiBurdenLevel = "High";
  }

  // Calculate home loan recency
  let homeLoanRecency = null;
  if (mqlEnrichment?.latest_home_loan_date) {
    const loanDate = new Date(mqlEnrichment.latest_home_loan_date);
    const yearsSinceLoan = (Date.now() - loanDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    homeLoanRecency = yearsSinceLoan < 3 ? "Within 3 years" : yearsSinceLoan < 5 ? "3-5 years ago" : "5+ years ago";
  }

  // Calculate card portfolio strength
  let cardPortfolioStrength = null;
  if (mqlEnrichment?.has_premium_cards) {
    cardPortfolioStrength = "Premium";
  } else if (mqlEnrichment?.credit_card_count && mqlEnrichment.credit_card_count >= 2) {
    cardPortfolioStrength = "Standard";
  } else if (mqlEnrichment?.credit_card_count) {
    cardPortfolioStrength = "Basic";
  }

  // NEW: Parse loan counts from MQL raw_response
  let guarantorLoanCount = mqlEnrichment?.guarantor_loan_count || null;
  let jointLoanCount = null;
  let totalCollateralValueCr = null;
  let totalActiveEmiMonthly = null;
  let educationLoanPresent = false;

  if (mqlEnrichment?.raw_response?.leads?.[0]?.banking?.banking_loans) {
    const loans = mqlEnrichment.raw_response.leads[0].banking.banking_loans;
    guarantorLoanCount = loans.filter((l: any) => l.ownership_type === "Guarantor").length || null;
    jointLoanCount = loans.filter((l: any) => l.ownership_type === "Joint Account").length || null;

    // Calculate total collateral value
    let collateralSum = 0;
    for (const loan of loans) {
      if (loan.collateral_value && loan.collateral_value > 0) {
        collateralSum += loan.collateral_value;
      }
    }
    totalCollateralValueCr = collateralSum > 0 ? Math.round((collateralSum / 10000000) * 100) / 100 : null;

    // Calculate total active EMI
    let emiSum = 0;
    for (const loan of loans) {
      if (loan.installment_amount && loan.account_status === "Active") {
        emiSum += loan.installment_amount;
      }
    }
    totalActiveEmiMonthly = emiSum > 0 ? emiSum : null;

    // Check for education loans
    educationLoanPresent = loans.some(
      (l: any) =>
        l.account_type?.toLowerCase().includes("education") || l.account_type?.toLowerCase().includes("student"),
    );
  }

  // NEW: Calculate search_duration_months
  let searchDurationMonths = null;
  const searchingSince = rawData["Searching Property since"];
  if (searchingSince === "1 - 6 Months") searchDurationMonths = 3;
  else if (searchingSince === "6 Months - 1 Year") searchDurationMonths = 9;
  else if (searchingSince === "More Than 1 Year") searchDurationMonths = 15;

  // NEW: Extract specific_unit_interest from CRM fields
  let specificUnitInterest = null;
  const tower = rawData["Interested Tower"];
  const floor = rawData["Floor"] || rawData["Desired Floor Band"];
  if (tower && floor) {
    specificUnitInterest = [`${tower}-${floor}`];
  } else if (rawData["Interested Unit"]) {
    specificUnitInterest = [rawData["Interested Unit"]];
  }

  // NEW: Extract non_booking_reason
  const nonBookingReason = rawData["Why Not Booked Today"] || rawData["Reason for not booking on SPOT"] || null;

  return {
    demographics: {
      age: mqlEnrichment?.age || null,
      gender: mqlEnrichment?.gender || null,
      family_stage: null,
      nri_status: rawData["Correspondence Country"] && rawData["Correspondence Country"] !== "India",
      residence_location: rawData["Location of Residence"] || null,
      building_name: rawData["Building Name"] || null,
      locality_grade: mqlEnrichment?.locality_grade || null,
      income_earners: null,
      years_at_current_residence: null,
      family_size: null,
      children_count: null,
      children_ages: null,
    },
    professional_profile: {
      occupation_type: rawData["Occupation"] || null,
      designation: mqlEnrichment?.designation || rawData["Designation"] || null,
      employer: mqlEnrichment?.employer_name || rawData["Place of Work"] || null,
      industry: mqlEnrichment?.industry || rawData["Industry / Sector"] || null,
      business_type: mqlEnrichment?.business_type || null,
      turnover_tier: mqlEnrichment?.turnover_slab || null,
      work_location: rawData["Place of Work"] || null,
      company_type: null,
    },
    financial_signals: {
      budget_stated_cr: null,
      in_hand_funds_pct: null,
      funding_source: rawData["Source of Funding"] || null,
      income_tier: null,
      credit_rating: creditRating,
      emi_burden_level: emiBurdenLevel,
      mql_capability: mqlEnrichment?.mql_capability || null,
      mql_lifestyle: mqlEnrichment?.mql_lifestyle || mqlEnrichment?.lifestyle || null,
      investor_signal: (mqlEnrichment?.home_loan_active || 0) >= 2,
      home_loan_recency: homeLoanRecency,
      home_loan_count: mqlEnrichment?.home_loan_count || null,
      home_loan_active: mqlEnrichment?.home_loan_active || null,
      home_loan_paid_off: mqlEnrichment?.home_loan_paid_off || null,
      guarantor_loan_count: guarantorLoanCount,
      joint_loan_count: jointLoanCount,
      total_collateral_value_cr: totalCollateralValueCr,
      total_active_emi_monthly: totalActiveEmiMonthly,
      education_loan_present: educationLoanPresent,
      stated_family_income_lpa: null,
      card_portfolio_strength: cardPortfolioStrength,
      auto_loan_count: mqlEnrichment?.auto_loan_count || null,
      consumer_loan_count: mqlEnrichment?.consumer_loan_count || null,
      credit_history_years: null,
    },
    property_preferences: {
      config_interested: rawData["Interested Unit"] || null,
      carpet_area_desired: rawData["Desired Carpet Area"] || null,
      floor_preference: rawData["Desired Floor Band"] || null,
      stage_preference: rawData["Stage of Construction"] || null,
      facing_preference: null,
      current_carpet_sqft: null,
      upgrade_ratio: null,
      specific_unit_interest: specificUnitInterest,
      alternative_shown: null,
    },
    engagement_signals: {
      visit_count: parseInt(rawData["No. of Site Re-Visits"] || "0") + 1,
      days_since_last_visit: null,
      is_duplicate_lead: rawData["Duplicate check"] === "Duplicate",
      sample_feedback: "not_seen",
      decision_makers_present: null,
      spot_closure_asked: false,
      finalization_timeline: null,
      searching_since: rawData["Searching Property since"] || null,
      possession_urgency: null,
      expected_closure_days: null,
      search_duration_months: searchDurationMonths,
      visit_quality: null,
      revisit_promised: false,
      non_booking_reason: nonBookingReason,
      roots_feedback: null,
      negotiation_asks: null,
    },
    concerns_extracted: [],
    competitor_intelligence: {
      competitors_mentioned: rawData["Competitor Name"]
        ? [
            {
              name: rawData["Competitor Name"],
              project: rawData["Competition Project Name"] || null,
              visit_status: rawData["Competition Visit Status"] || null,
              carpet_stated: null,
              price_stated_cr: null,
              price_per_sqft: null,
              advantage_stated: null,
            },
          ]
        : [],
      alternative_if_not_kl: null,
      lost_to_competitor: rawData["Lost Reason"] || null,
    },
    historical_signals: {
      existing_kalpataru_property: rawData["Owned/Stay in Kalpataru Property"] || null,
      referral_source: rawData["Sub Source 2"] || null,
      previous_enquiry_project: null,
    },
    lifestyle_signals: {
      lifestyle_activities: null,
      car_ownership: null,
      travel_profile: null,
    },
    core_motivation: "Property purchase",
    visit_notes_summary: rawData["Visit Comments"]?.substring(0, 100) || "No visit notes available",
    brand_loyalty: rawData["Owned/Stay in Kalpataru Property"] === "Yes",
    mql_data_available: mqlAvailable,

    // Evidence sections (empty for fallback)
    demographics_evidence: {
      family_composition: null,
      current_home_details: null,
      lifestyle_context: null,
    },
    professional_evidence: {
      role_context: null,
      work_location_detail: null,
    },
    financial_evidence: {
      stated_budget_quote: null,
      funding_plan_detail: null,
      income_context: null,
    },
    preferences_evidence: {
      sample_response_quote: null,
      comparison_to_current: null,
      unit_discussion: null,
    },
    engagement_evidence: {
      first_visit_summary: rawData["Visit Comments"]?.substring(0, 150) || null,
      latest_visit_summary: rawData["Site Re-Visit Comment"]?.substring(0, 150) || null,
      objection_stated: null,
      next_steps_stated: null,
    },
    competitor_evidence: {
      competitor_comparison_quote: null,
      preference_reasoning: null,
    },
    motivation_evidence: {
      stated_motivation_quote: null,
      upgrade_drivers: null,
      location_pull: null,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leads, projectId, chunkIndex: reqChunkIndex, totalChunks: reqTotalChunks } = await req.json();
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

    // ============= PROMPT SECTIONS (Preserved from original) =============

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
- Elite Corporate (VP, Director, CHRO, CXO at major firms) OR income > 70L: 10 pts
- High-Skill Professional (Specialist Doctors, CA Partners, Pilots, Merchant Navy Officers) OR income 50-70L: 8 pts
- Business Owner - Score by TURNOVER TIER (see Business Owner Scoring below): 4-12 pts
- Mid-Senior Corporate (Sr. Manager, Project Manager at IT/Banking/MNCs) OR income 25-50L: 6 pts
- Retired/Homemaker (with visible asset base): 5 pts
- Entry/Mid-Level Salaried (Sales Manager, Executive, Jr. Engineer) OR income < 25L: 4 pts
- Unknown/Unclear occupation: 3 pts

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
- Gap 10-20%: 6 pts
- Gap 20-30%: 2 pts
- Gap > 30% or Budget not stated: 0 pt

WITH MQL DATA (Enhanced Scoring):
- MQL capability "high" + Budget vs price gap is within 10% or less: 10 pts
- MQL capability "high" + Budget vs price gap is within 10-30%: 8 pts
- MQL capability "medium" + Budget vs price gap is within 10% or less: 7 pts
- MQL capability "medium" + Budget vs price gap iswithin 10-30%: 5 pts
- MQL capability "low": Cap at 2 pts regardless of stated budget

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

## DIMENSION B: INTENT & ENGAGEMENT (IE) - 15 Points Max

### B1. Visit Behavior (10 pts):
- 3+ Revisits OR brought full family: 10 pts
- 2nd Revisit: 8 pts
- First Visit but duplicate lead (returned): 7 pts
- First Visit + Positive feedback/visited sample flat: 6 pts
- First Visit + Neutral/negative feedback: 3 pts

### B2. Awareness Signal (5 pts):
If MQL home_loan_count > 0: +2 bonus (indicates active property buyer/investor)
- Visited premium competitors: 5 pts
- If existing Kalpatru resident: 5 pts
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

## DIMENSION D: PRODUCT-MARKET FIT (PMF) - 25 Points Max

### D1. Configuration Match (10 pts):
Factor in MQL lifestyle for expectation alignment:
- Exact match + MQL lifestyle "luxury" OR "aspirational" matches premium project: 10 pts
- Minor compromise: 7 pts
- Major compromise: 4 pts

### D2. Location Fit (15 pts):
- If already stays in Thane or has lived in Thane: 15 pts
- If positive feedback about location or clear reason mentioned in CRM notes why they want to move here - 12 pts
- If work location is in Thane or close to project location: 10 pts
- If looking to move here for retirement: 8 pts
- If they live in a location which is more than 20km away from Thane: 5 pts
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
        competitorPricingMatrix += `| ${compName} | ${inv.config || "N/A"} | ${inv.carpet_sqft || "N/A"} | ₹${inv.price_range || "N/A"} | ${inv.possession || comp.possession || "N/A"} | ${inv.notes || ""} |\n`;
      }
    }

    // Add Eternia inventory for comparison
    const eterniaInventory = projectMetadata?.inventory?.configurations || [];
    competitorPricingMatrix += `\n## ETERNIA INVENTORY (For Comparison):\n`;
    for (const config of eterniaInventory) {
      competitorPricingMatrix += `- ${config.type}: ${config.carpet_sqft_range?.[0]}-${config.carpet_sqft_range?.[1]} sqft, ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr, Target: ${config.target_persona || "N/A"}\n`;
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
9. For Business Owners: Describe scale abstractly (e.g., "established manufacturing business" not "turnover 5Cr-25Cr")

## OUTPUT FIELD RESTRICTIONS (NON-NEGOTIABLE - ABSOLUTE REQUIREMENT):
The following output fields MUST NEVER contain ANY mention of credit, loans, EMI, borrowing, debt, or credit-related information:
- rating_rationale: NO credit scores, NO loan counts, NO EMI burden, NO credit rating, NO loan history, NO borrowing capacity
- persona_description: NO credit information, NO loan history, NO EMI references, NO debt profile
- summary: NO credit data, NO loan details, NO EMI or borrowing information, NO financial obligations

This restriction is ABSOLUTE and NON-NEGOTIABLE. Credit/loan/EMI data may ONLY be used for internal PPS scoring calculations.
The output text must NEVER reveal that credit, loan, or EMI data was considered or analyzed.
Violations of this rule are unacceptable under any circumstances.`;

    const outputConstraints = `# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Rating rationale should start with "**PPS Score: X/100.**" in bold, followed by key scoring factors. Do NOT include rating label like "(Hot)" or "(Warm)" in the rationale - that's shown separately
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.`;

    const concernGeneration = `#Key Concerns: These must be the CUSTOMER'S concerns about the project or specific unit they are considering. Focus on: price/budget gap, location/connectivity issues, possession date/timeline, unit configuration/size, amenities/facilities. DO NOT include generic sales concerns.
- Concern Categories: For EACH key_concern, classify it into ONE of these categories (same order as key_concerns array):
  1. "Price" - Budget gaps, pricing issues, financing concerns, EMI issues. Only show this as a concern if the customer mentions price being too high or there is abudget gap of more than 20%
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
  "mql_data_available": boolean
}`;

    // ============= TWO-STAGE ANALYSIS PIPELINE (SEQUENTIAL) =============

    // Helper function to process a single lead
    async function processLeadAnalysis(leadWithMql: any): Promise<any> {
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
          homeLoanRecency =
            yearsSinceLoan < 3 ? "Within 3 years" : yearsSinceLoan < 5 ? "3-5 years ago" : "5+ years ago";
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

      // ===== STAGE 1: Extract Signals =====
      console.log(`Stage 1 (Extraction) starting for lead ${lead.id}`);

      const stage1Prompt = buildStage1Prompt(
        leadDataJson,
        mqlSection,
        mqlAvailable,
        crmFieldExplainer,
        mqlFieldExplainer,
      );

      let extractedSignals;
      try {
        const stage1Response = await callGeminiAPI(stage1Prompt, googleApiKey!, true);
        extractedSignals = JSON.parse(stage1Response);
        console.log(`Stage 1 complete for lead ${lead.id}`);
      } catch (stage1Error) {
        console.error(`Stage 1 failed for lead ${lead.id}:`, stage1Error);
        // Fallback: Create basic extracted signals from available data
        extractedSignals = createFallbackExtraction(lead, mqlEnrichment);
        console.log(`Using fallback extraction for lead ${lead.id}`);
      }

      // Rate limit delay: Wait 2500ms before Stage 2 API call
      console.log(`Waiting 2500ms before Stage 2 for lead ${lead.id}...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // ===== STAGE 2: Score & Generate =====
      console.log(`Stage 2 (Generation) starting for lead ${lead.id}`);

      const stage2Prompt = buildStage2Prompt(
        JSON.stringify(extractedSignals, null, 2),
        systemPrompt,
        brandContext,
        projectContext,
        leadScoringModel,
        personaDefinitions,
        privacyRules,
        outputConstraints,
        concernGeneration,
        talkingpointsGeneration,
        outputStructure,
      );

      let analysisResult;
      let parseSuccess = true;

      try {
        const stage2Response = await callGeminiAPI(stage2Prompt, googleApiKey!, true);
        analysisResult = JSON.parse(stage2Response);
        console.log(`Stage 2 complete for lead ${lead.id}`);
      } catch (stage2Error) {
        parseSuccess = false;
        console.error(`Stage 2 failed for lead ${lead.id}:`, stage2Error);

        // Create fallback analysis result
        analysisResult = {
          ai_rating: "Warm",
          rating_confidence: "Low",
          rating_rationale: "Analysis completed with limited structure",
          summary: extractedSignals.visit_notes_summary || "Unable to analyze lead",
          mql_data_available: mqlAvailable,
        };
      }

      // Apply MQL-based final score adjustment (internal calibration)
      if (parseSuccess && analysisResult.pps_score !== undefined) {
        const mqlRating = mqlEnrichment?.mql_rating || "N/A";
        let adjustedPpsScore = analysisResult.pps_score;

        switch (mqlRating) {
          case "P0":
            // No adjustment
            break;
          case "P1":
            adjustedPpsScore = Math.round(adjustedPpsScore * 0.9);
            break;
          case "P2":
            adjustedPpsScore = Math.round(adjustedPpsScore * 0.8);
            break;
          default:
            adjustedPpsScore = Math.round(adjustedPpsScore * 0.95);
            break;
        }

        // Re-derive rating based on adjusted score
        let adjustedRating: "Hot" | "Warm" | "Cold";
        if (adjustedPpsScore >= 85) {
          adjustedRating = "Hot";
        } else if (adjustedPpsScore >= 65) {
          adjustedRating = "Warm";
        } else {
          adjustedRating = "Cold";
        }

        analysisResult.pps_score = adjustedPpsScore;
        analysisResult.ai_rating = adjustedRating;
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
    }

    // Helper function to store analysis result
    async function storeAnalysisResult(result: any, projectId: string, leadsToAnalyze: any[]) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
        if (!lead) return;

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

    // Extract chunk info from request (for progress logging)
    const chunkIndex = reqChunkIndex || 1;
    const totalChunks = reqTotalChunks || 1;

    console.log(`Processing chunk ${chunkIndex}/${totalChunks} with ${leadsToAnalyze.length} leads`);

    // Sequential processing (chunks are small by design - max 2 leads per chunk)
    const freshResults: any[] = [];

    for (let index = 0; index < leadsToAnalyze.length; index++) {
      const leadWithMql = leadsToAnalyze[index];

      // Add 2500ms delay between leads (not before first one)
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      console.log(`Processing lead ${index + 1}/${leadsToAnalyze.length}: ${leadWithMql.id}`);

      try {
        const result = await processLeadAnalysis(leadWithMql);
        freshResults.push(result);

        // Store result immediately (enables partial progress)
        await storeAnalysisResult(result, projectId, leadsToAnalyze);
      } catch (error) {
        console.error(`Failed to process lead ${leadWithMql.id}:`, error);
        freshResults.push({
          leadId: leadWithMql.id,
          rating: "Warm",
          insights: "Analysis failed",
          fullAnalysis: {},
          parseSuccess: false,
          fromCache: false,
          revisitDate: null,
        });
      }
    }

    const allResults = [...cachedResults, ...freshResults];
    const successCount = allResults.filter((r) => r.parseSuccess).length;

    console.log(`Analysis complete: ${successCount}/${allResults.length} successful (sequential 2-stage pipeline)`);

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
