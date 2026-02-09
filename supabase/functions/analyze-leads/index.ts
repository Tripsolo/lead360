import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildStage3Prompt, 
  checkSafetyConditions,
  getNBARuleDef,
  normalizePersona,
  detectObjectionCategories,
  mapToMatrixObjection,
  lookupMatrixEntry,
  getTalkingPointDef,
  type NBAActionType
} from "./nba-framework.ts";
import {
  evaluateOutputs,
  type TowerInventoryRow,
  type CompetitorPricingRow,
  type SisterProjectRow,
} from "./evaluator.ts";

// Declare EdgeRuntime for background task processing
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to convert Excel serial date to ISO string
function excelDateToISOString(excelDate: any): string | null {
  if (!excelDate) return null;
  
  // If it's already a valid ISO string or date string, return as-is
  if (typeof excelDate === 'string' && isNaN(Number(excelDate))) {
    return excelDate;
  }
  
  // If it's a number (Excel serial date), convert it
  if (typeof excelDate === 'number' || !isNaN(Number(excelDate))) {
    const numDate = Number(excelDate);
    // Excel dates start from 1900-01-01 (serial 1)
    // JavaScript Date epoch adjustment: Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + numDate * 24 * 60 * 60 * 1000);
    return jsDate.toISOString();
  }
  
  return null;
}

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

### Budget Parsing (CRITICAL - STANDARDIZATION REQUIRED):
Parse budget from visit comments and ALWAYS convert to Crores as a decimal number.

## PARSING PATTERNS (All must be converted to Crore decimal):

| Input Pattern | Interpretation | Output (budget_stated_cr) |
|--------------|----------------|--------------------------|
| "1.5Cr", "1.5 Crore", "1.5 cr", "1.5CR" | 1.5 Crores | 1.5 |
| "150 lacs", "150 lakhs", "150L", "150 lac" | 150 Lakhs | 1.5 |
| "1,50,00,000", "15000000" | 1.5 Crore rupees | 1.5 |
| "82 lacs", "82L", "82 lakhs" | 82 Lakhs | 0.82 |
| "85-90 lacs" | Range: take midpoint (87.5L) | 0.875 |
| "1-1.2 Cr" | Range: take midpoint (1.1 Cr) | 1.1 |
| "1.3 to 1.5 cr" | Range: take midpoint | 1.4 |
| "around 2Cr", "approx 2 crore" | 2 Crores | 2.0 |
| "budget 2" (context shows Cr) | 2 Crores (assume Cr if >0 and <10) | 2.0 |
| "budget 150" (context shows L) | 150 Lakhs (assume L if 10-999) | 1.5 |

## CONVERSION RULES:
1. ALWAYS output budget_stated_cr in CRORES as a decimal number
2. 1 Crore = 100 Lakhs = 10,000,000 rupees
3. To convert Lakhs to Crores: divide by 100 (e.g., 150L → 1.5Cr)
4. To convert raw rupees to Crores: divide by 10,000,000
5. For ranges, use the midpoint value
6. For ambiguous numbers (just "2" or "150"):
   - If 0-10: Assume Crores (e.g., "2" → 2.0 Cr)
   - If 10-999: Assume Lakhs (e.g., "150" → 1.5 Cr)
   - If 1000+: Assume raw rupees (e.g., "15000000" → 1.5 Cr)

## EXAMPLES FROM REAL CRM COMMENTS:
- "budget is 1.2-1.3 Cr" → 1.25
- "looking in 90 lacs range" → 0.9
- "can stretch to 1.5 cr max" → 1.5
- "budget around 1,30,00,000" → 1.3
- "80-90 L budget" → 0.85
- "2 crore budget" → 2.0
- "budget 1.75" → 1.75 (assume Cr since <10)

## FIELD PRECEDENCE RULES (CRITICAL - STANDARDIZED):
When both CRM and MQL data are available, apply these rules:

| Field | Winner | Condition |
|-------|--------|-----------|
| Designation | CRM | Always (CRM values are more specific job titles) |
| Occupation Type | CRM | Always |
| Employer | MQL | Only if MQL is not empty (verified from banking records) |
| Location | MQL | Only if MQL is not empty |
| Age | MQL | Only if MQL is not empty |
| Gender | MQL | Only if MQL is not empty |
| Locality Grade | MQL | Only if MQL is not empty |
| Income | MQL | Only if MQL is not empty (final_income_lacs) |
| Budget | Complementary | Use CRM budget_stated as primary |

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

### Proxy Buyer Detection (CRITICAL):
14. decision_makers_present:
    - "All": All decision makers were present during visit
    - "Partial": Primary buyer present but spouse/parent/child needs to be consulted
    - "Proxy": Set to "Proxy" if ANY of these patterns detected:
      * "on behalf of" / "for my [brother/sister/parent/friend]"
      * "my [brother/sister/son/daughter] wants" / "[sibling] is looking"
      * "visiting for someone else" / "checking for family member"
      * "will share with [family member] who will decide"
      * CRM field "Who will take decision" = different person from visitor
      * "brother visiting", "sister's requirement", "parents want"
    - When Proxy is detected, also extract:
      * proxy_relationship: Who is the visitor (e.g., "brother", "friend", "colleague")
      * actual_decision_maker: Who will make the final decision (e.g., "sister in Dubai")
      * decision_maker_availability: If mentioned (e.g., "abroad", "can visit next month", "busy")

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
- Evidence sections ground the Stage 2 outputs in real data, preventing hallucination

## CRM COMPLIANCE ASSESSMENT (CIS) - Evaluate CRM Entry Quality

### Compliance Score (50 points total) - Award 5 points for each field present with valid data:
1. has_budget: Budget mentioned (number or range stated in visit comments)
2. has_carpet_requirement: Carpet area in sqft or BHK preference mentioned
3. has_in_hand_funds: Any in-hand/down payment amount mentioned
4. has_finalization_timeline: Decision timeframe stated (days/weeks/months)
5. has_possession_preference: Possession timeline or stage preference mentioned
6. has_core_motivation: Clear buying reason documented (upgrade, investment, end-use)
7. has_current_residence: Current home details (location, size, type) documented
8. has_family_composition: Family members/composition described
9. has_income_funding: Salary range, loan eligibility, or funding method mentioned
10. has_spot_closure_attempt: Evidence manager asked for booking/cheque/commitment

### Insight Depth Score (50 points total):
- has_competitor_comparison: 10 pts if competitor name + price/carpet detailed; 5 pts if only name. Set competitor_detail_quality accordingly.
- has_pricing_gap_quantified: 5 pts if specific rupee/percentage gap documented
- has_sample_flat_feedback: 5 pts if customer reaction captured. sample_feedback_quality = "Detailed" if specific likes/dislikes, "Basic" if just positive/negative
- has_roots_feedback: 5 pts if specific park/township feedback captured
- has_non_booking_reason: 10 pts if actionable reason documented; 5 pts if generic. Set non_booking_reason_quality accordingly.
- has_decision_maker_context: 5 pts if clear who needs to decide/be consulted
- has_lifestyle_context: 5 pts if specific lifestyle needs/preferences captured
- remarks_word_count: Count total words in "Remarks in Detail" or "Visit Comments". Award 5 pts if >50 words.

### CIS Calculation:
- compliance_score: Sum of compliance points (0-50)
- insight_score: Sum of insight points (0-50)
- cis_total: compliance_score + insight_score (0-100)
- cis_rating: >=90 "Exceptional", >=70 "Good", >=50 "Adequate", >=30 "Needs Improvement", <30 "Poor"`;

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
    "quoted_price_cr": number | null,
    "budget_gap_percent": number | null,  // Calculate: ((quoted_price - budget_stated) / quoted_price) * 100. Positive = over budget, Negative = under budget
    "customer_mentioned_price_high": boolean,  // TRUE only if customer explicitly says "too expensive", "out of budget", "pricing gap", etc.
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
    "proxy_relationship": "string | null",  // e.g., "brother", "friend" - who is visiting on behalf
    "actual_decision_maker": "string | null",  // Who will make the final decision
    "decision_maker_availability": "string | null",  // e.g., "abroad", "can visit next month"
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
    { 
      "topic": "Price" | "Location" | "Possession" | "Config" | "Amenities" | "Trust" | "Others", 
      "sub_topic": "Connectivity" | "School Proximity" | "Ecosystem Rebuild" | "Social Circle" | "Infrastructure" | "Budget Gap" | "Payment Terms" | null,
      "detail": "string",
      "customer_words": "string | null"  // Direct quote if available
    }
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
  
  "crm_compliance_assessment": {
    "has_budget": boolean,
    "has_carpet_requirement": boolean,
    "has_in_hand_funds": boolean,
    "has_finalization_timeline": boolean,
    "has_possession_preference": boolean,
    "has_core_motivation": boolean,
    "has_current_residence": boolean,
    "has_family_composition": boolean,
    "has_income_funding": boolean,
    "has_spot_closure_attempt": boolean,
    "has_competitor_comparison": boolean,
    "competitor_detail_quality": "Detailed" | "Basic" | "Missing",
    "has_pricing_gap_quantified": boolean,
    "has_sample_flat_feedback": boolean,
    "sample_feedback_quality": "Detailed" | "Basic" | "Missing",
    "has_roots_feedback": boolean,
    "has_non_booking_reason": boolean,
    "non_booking_reason_quality": "Actionable" | "Generic" | "Missing",
    "has_decision_maker_context": boolean,
    "has_lifestyle_context": boolean,
    "remarks_word_count": number,
    "compliance_score": number,
    "insight_score": number,
    "cis_total": number,
    "cis_rating": "Exceptional" | "Good" | "Adequate" | "Needs Improvement" | "Poor"
  },
  
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
  sisterProjectsContext: string,
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

7. CROSS-SELL EVALUATION (if sister projects available):
   - Check if lead's requirements match any sister project's cross-sell triggers
   - Consider: budget constraints, RTMI needs, config preference, GCP view interest
   - Generate cross_sell_recommendation if a clear match exists, otherwise set to null

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
   - ⚠️ PRICE VALIDATION: Before adding "Price" to key_concerns, CHECK:
     * If financial_signals.budget_gap_percent ≤ 20 AND customer_mentioned_price_high = false: DO NOT add Price
     * Only add "Price" if gap > 20% OR customer explicitly complained about pricing

5. **NEXT BEST ACTION**: Reference engagement_evidence.next_steps_stated and negotiation_asks
   - Tailor action based on stated next steps and any negotiation requests

CRITICAL: Do not fabricate quotes or facts. Only use evidence that is present (not null). If evidence is null, generate based on signals only.`;

  return `${systemPrompt}

${brandContext}

${projectContext}

${sisterProjectsContext}

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

// ============= Model Configuration =============
// Stage 1 & 3: Gemini 3 Flash Preview (Primary) / Gemini 2.5 Flash (Fallback)
// Stage 2: Claude Opus 4.5 via OpenRouter (Primary) / Gemini 2.5 Pro (Fallback)

// ============= Gemini API Call Helper (gemini-2.5-pro - Stage 2 Fallback) =============
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        break;
      }

      const errorText = await response.text();

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini 2.5 Pro API overloaded (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("Gemini 2.5 Pro API error:", errorText);
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

// ============= Gemini 3 Flash API (Stage 1 & 3 Primary) =============
async function callGemini3FlashAPI(
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        break;
      }

      const errorText = await response.text();

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini 3 Flash API overloaded (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("Gemini 3 Flash API error:", errorText);
      lastError = new Error(`Gemini 3 Flash API call failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini 3 Flash fetch error (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  if (!response?.ok) {
    throw lastError || new Error("Gemini 3 Flash API call failed after retries");
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  return typeof part?.text === "string" ? part.text : JSON.stringify(candidate ?? data);
}

// ============= Gemini 2.5 Flash API (Stage 1 & 3 Fallback) =============
async function callGemini25FlashAPI(
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        break;
      }

      const errorText = await response.text();

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini 2.5 Flash API overloaded (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("Gemini 2.5 Flash API error:", errorText);
      lastError = new Error(`Gemini 2.5 Flash API call failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini 2.5 Flash fetch error (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  if (!response?.ok) {
    throw lastError || new Error("Gemini 2.5 Flash API call failed after retries");
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const part = candidate?.content?.parts?.[0];
  return typeof part?.text === "string" ? part.text : JSON.stringify(candidate ?? data);
}

// ============= OpenRouter API (Stage 2 Primary - Claude Opus 4.5) =============
async function callOpenRouterAPI(
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 3,
): Promise<string> {
  const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cx360.lovable.app",
          "X-Title": "CX360 Lead Analysis"
        },
        body: JSON.stringify({
          model: "anthropic/claude-opus-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 8192
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        return content;
      }

      const errorText = await response.text();
      
      // Handle rate limits with exponential backoff
      if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`OpenRouter rate limited (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("OpenRouter API error:", errorText);
      lastError = new Error(`OpenRouter call failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`OpenRouter fetch error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("OpenRouter API call failed after retries");
}

// ============= Helper: Extract room count from config string =============
function extractRoomCount(config: string | null): number | null {
  if (!config) return null;
  const match = config.match(/(\d+)\s*BHK/i);
  return match ? parseInt(match[1]) : null;
}

// ============= Cross-Sell API (Gemini 3 Flash) =============
async function callCrossSellAPI(
  prompt: string,
  googleApiKey: string,
  maxRetries: number = 2,
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const generationConfig = {
        temperature: 0.1,  // Lower temperature for more deterministic rule-following
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(text);
      }

      const errorText = await response.text();
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 500;
        console.warn(`Cross-sell API rate limited (attempt ${attempt}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      
      lastError = new Error(`Cross-sell API failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
    }
  }
  
  console.error("Cross-sell API failed after retries:", lastError);
  return { cross_sell_recommendation: null, evaluation_log: "API call failed" };
}

// ============= STAGE 2.5: Cross-Sell Recommendation Prompt =============
function buildCrossSellPrompt(
  analysisResult: any,
  extractedSignals: any,
  sisterProjects: any[],
  projectMetadata: any,
  towerInventory: any[],      // NEW: Tower inventory data
  competitorPricing: any[]    // NEW: Competitor pricing data
): string {
  // Group tower inventory by project_id for efficient lookup
  const inventoryByProject = (towerInventory || []).reduce((acc: any, inv: any) => {
    if (!acc[inv.project_id]) acc[inv.project_id] = [];
    acc[inv.project_id].push(inv);
    return acc;
  }, {} as Record<string, any[]>);

  // Build sister projects data with CLOSING PRICES from tower inventory
  const sisterProjectsData = sisterProjects.map((sp: any) => {
    const meta = sp.metadata || {};
    const triggers = sp.cross_sell_triggers || {};
    
    // Get tower inventory for this sister project
    const projectInventory = inventoryByProject[sp.id] || [];
    
    // Group inventory by typology and get min/max closing prices (TOTAL VALUE)
    const configsFromInventory = Object.values(
      projectInventory.reduce((acc: any, inv: any) => {
        const key = inv.typology;
        if (!key) return acc;
        
        if (!acc[key]) {
          acc[key] = {
            type: inv.typology,
            carpet_sqft_min: inv.carpet_sqft_min,
            carpet_sqft_max: inv.carpet_sqft_max,
            closing_price_min_cr: inv.closing_min_cr,  // TOTAL VALUE - PRIMARY FOR BUDGET
            closing_price_max_cr: inv.closing_max_cr,  // TOTAL VALUE - PRIMARY FOR BUDGET
            oc_date: inv.oc_date,
            unsold: inv.unsold || 0,
            construction_status: inv.construction_status,
            rooms: extractRoomCount(inv.typology)
          };
        } else {
          // Aggregate: min of mins, max of maxes across towers
          if (inv.carpet_sqft_min && (!acc[key].carpet_sqft_min || inv.carpet_sqft_min < acc[key].carpet_sqft_min)) {
            acc[key].carpet_sqft_min = inv.carpet_sqft_min;
          }
          if (inv.carpet_sqft_max && (!acc[key].carpet_sqft_max || inv.carpet_sqft_max > acc[key].carpet_sqft_max)) {
            acc[key].carpet_sqft_max = inv.carpet_sqft_max;
          }
          if (inv.closing_min_cr && (!acc[key].closing_price_min_cr || inv.closing_min_cr < acc[key].closing_price_min_cr)) {
            acc[key].closing_price_min_cr = inv.closing_min_cr;
          }
          if (inv.closing_max_cr && (!acc[key].closing_price_max_cr || inv.closing_max_cr > acc[key].closing_price_max_cr)) {
            acc[key].closing_price_max_cr = inv.closing_max_cr;
          }
          acc[key].unsold += inv.unsold || 0;
          // Use earliest OC date for possession timeline
          if (inv.oc_date && (!acc[key].oc_date || new Date(inv.oc_date) < new Date(acc[key].oc_date))) {
            acc[key].oc_date = inv.oc_date;
          }
        }
        return acc;
      }, {} as Record<string, any>)
    );
    
    // Fallback to metadata if no inventory data for this project
    const configs = configsFromInventory.length > 0 
      ? configsFromInventory 
      : (meta.configurations || []).map((c: any) => ({
          type: c.type,
          carpet_sqft_min: c.carpet_sqft?.[0] || null,
          carpet_sqft_max: c.carpet_sqft?.[1] || null,
          closing_price_min_cr: c.price_cr?.[0] || null,  // Fallback to old field
          closing_price_max_cr: c.price_cr?.[1] || null,
          rooms: extractRoomCount(c.type)
        }));
    
    if (configsFromInventory.length === 0 && projectInventory.length === 0) {
      console.warn(`No tower inventory data for sister project ${sp.id} (${sp.name}), using metadata fallback`);
    }
    
    // Determine earliest OC date from inventory
    const earliestOcDate = configsFromInventory.length > 0
      ? (configsFromInventory as any[]).reduce((earliest: string | null, cfg: any) => {
          if (!earliest || (cfg.oc_date && new Date(cfg.oc_date) < new Date(earliest))) {
            return cfg.oc_date;
          }
          return earliest;
        }, null as string | null)
      : meta.oc_date || meta.rera_possession;
    
    // Check RTMI status from inventory (OC Received or >95% current_due)
    const hasRtmi = projectInventory.some((inv: any) => 
      inv.construction_status?.toLowerCase().includes('oc received') ||
      (inv.current_due_pct && inv.current_due_pct >= 95)
    );
    
    // Calculate total unsold inventory
    const totalUnsold = projectInventory.reduce((sum: number, inv: any) => sum + (inv.unsold || 0), 0);
    
    return {
      name: sp.name,
      id: sp.id,
      relationship_type: sp.relationship_type,
      possession_date: earliestOcDate,  // From tower inventory OC Date (prioritized)
      is_rtmi: hasRtmi || (meta.oc_received && meta.oc_received.length > 0),
      unique_selling: meta.unique_selling || "N/A",
      payment_plan: meta.payment_plan || "N/A",
      configurations: configs,
      triggers: triggers,
      total_unsold_inventory: totalUnsold,
      data_source: configsFromInventory.length > 0 ? "tower_inventory" : "metadata_fallback"
    };
  });
  
  // Extract lead's stated preferences
  const leadBudget = extractedSignals?.financial_signals?.budget_stated_cr || null;
  const leadConfig = extractedSignals?.property_preferences?.config_interested || null;
  const leadCarpetDesired = extractedSignals?.property_preferences?.carpet_area_desired || null;
  const leadPossessionUrgency = extractedSignals?.engagement_signals?.possession_urgency || null;
  const leadStagePreference = extractedSignals?.property_preferences?.stage_preference || null;
  const leadRooms = extractRoomCount(leadConfig);
  
  // Build competitor reference section (top 10 for context)
  const competitorRef = (competitorPricing || []).slice(0, 10).map((cp: any) => 
    `- ${cp.competitor_name} ${cp.project_name} ${cp.config}: ₹${cp.price_min_av || 'N/A'}-${cp.price_max_av || 'N/A'}L (${cp.avg_psf || 'N/A'} PSF)`
  ).join('\n');
  
  const crossSellPrompt = `# CROSS-SELL RECOMMENDATION EVALUATION

You are evaluating whether a lead should be recommended a sister project from the same township.

## KNOWLEDGE BASE FIELD EXPLAINER (CRITICAL - PRICING RULES)

### PRICING HIERARCHY
- **closing_price_min_cr / closing_price_max_cr**: ALL-INCLUSIVE Total Value (Base + Floor Rise + Facing Premium + GST + Stamp Duty)
- This is the PRIMARY field for budget comparison - the actual amount customer will pay
- NEVER use base PSF * carpet area as a proxy for budget comparison
- If closing_price fields are null, the data source is "metadata_fallback" and has lower confidence

### POSSESSION HIERARCHY
- **oc_date**: Actual expected possession date per tower (PRIMARY)
- **is_rtmi**: True if construction_status = "OC Received" or current_due >= 95%
- RERA date is regulatory deadline only - never use for customer timeline

## LEAD PROFILE (Extracted from Stage 2)
- Stated Budget: ${leadBudget ? `₹${leadBudget} Cr` : "Not stated"}
- Desired Config: ${leadConfig || "Not stated"}
- Desired Rooms: ${leadRooms || "Unknown"}
- Desired Carpet Area: ${leadCarpetDesired || "Not stated"}
- Possession Urgency: ${leadPossessionUrgency || "Not stated"}
- Stage Preference: ${leadStagePreference || "Not stated"}
- Persona: ${analysisResult.persona || "Unknown"}
- Primary Concern: ${analysisResult.primary_concern_category || "Unknown"}
- Core Motivation: ${analysisResult.extracted_signals?.core_motivation || "Unknown"}

## SISTER PROJECTS AVAILABLE (with CLOSING PRICES from Tower Inventory)
${JSON.stringify(sisterProjectsData, null, 2)}

## COMPETITOR REFERENCE (For Talking Points)
${competitorRef || "No competitor data available"}

## CROSS-SELL EVALUATION RULES (CRITICAL - ALL MUST PASS)

### RULE 1: BUDGET CEILING (20% MAX)
- The recommended project's entry price (closing_price_min_cr for matching config) must NOT exceed 120% of the lead's stated budget.
- **closing_price_min_cr = All-inclusive Total Value (Base + Floor Rise + GST + Stamp Duty)**
- Formula: IF (closing_price_min_cr > lead_budget * 1.20) THEN REJECT
- NEVER use base PSF * carpet area as a proxy for budget comparison.
- If budget is not stated (null), this rule FAILS. You cannot validate budget fit without a stated budget. Set budget_check to "FAIL" and do NOT recommend a cross-sell project. The sales team should first discover the customer's budget before making cross-sell recommendations.

### RULE 2: POSSESSION MARGIN (8 MONTHS MAX)
- The possession date difference from lead's expectation must be within 8 months.
- Use oc_date (possession_date field) - NOT RERA date.
- If lead needs RTMI, only recommend projects with is_rtmi = true OR possession within 8 months from today.
- If lead has no specific possession urgency, this rule passes automatically.
- However, if lead explicitly needs RTMI and no sister project has is_rtmi=true AND earliest oc_date > 8 months from today, this rule FAILS.

### RULE 3: SIZE CONSTRAINT (10% SMALLER MAX)
- The recommended config's carpet area must not be more than 10% smaller than desired.
- Formula: IF (carpet_sqft_max < lead_desired_carpet * 0.90) THEN REJECT
- If carpet area is not stated, use typical config size comparison.

### RULE 4: ROOM COUNT CONSTRAINT (STRICT)
- NEVER recommend a config with FEWER rooms than desired.
- NEVER recommend a config with MORE THAN 1 ADDITIONAL room.
- Examples:
  - Lead wants 2 BHK → Can recommend 2 BHK or 3 BHK only (NOT 1 BHK, NOT 4 BHK)
  - Lead wants 3 BHK → Can recommend 3 BHK or 4 BHK only (NOT 2 BHK, NOT 5 BHK)
  - Lead wants 4 BHK → Can recommend 4 BHK only (5 BHK if exists, but never smaller)

### RULE 5: MATCH PRIORITY (If multiple pass)
If multiple sister projects pass all rules, prioritize:
1. RTMI needs (if lead has urgent possession)
2. Budget optimization (closest to stated budget)
3. Config exact match (same room count preferred)
4. GCP view preference (if lead expressed interest)
5. Inventory urgency (lower unsold = higher priority for urgency messaging)

## EVALUATION PROCESS
1. For each sister project, check ALL 4 rules above.
2. Use closing_price_min_cr (Total Value) for budget comparison - NOT agreement value or base PSF.
3. Log which rules pass/fail for each project.
4. If no project passes all rules, return null.
5. If one or more pass, select the best match per priority rules.

## OUTPUT STRUCTURE
Return a JSON object with ONLY these fields:
{
  "cross_sell_recommendation": {
    "recommended_project": "Primera" | "Estella" | "Immensa" | null,
    "recommended_config": "2 BHK" | "3 BHK" | "4 BHK" | null,
    "price_range_cr": "₹X.XX - ₹Y.YY Cr",
    "possession_date": "YYYY-MM",
    "reason": "Brief explanation of why this is a better fit (max 25 words)",
    "talking_point": "Specific sales pitch with price/config/possession details (max 25 words)",
    "rules_evaluation": {
      "budget_check": "PASS" | "FAIL" | "N/A",
      "possession_check": "PASS" | "FAIL" | "N/A",
      "size_check": "PASS" | "FAIL" | "N/A",
      "room_check": "PASS" | "FAIL" | "N/A"
    }
  } | null,
  "evaluation_log": "Brief log of which projects were considered and why they passed/failed"
}

If no sister project meets all criteria, return:
{
  "cross_sell_recommendation": null,
  "evaluation_log": "No sister project passed all validation rules. [Reason for each rejection]"
}

If budget_stated is null/not available, return:
{
  "cross_sell_recommendation": null,
  "evaluation_log": "Budget not stated - cannot validate cross-sell affordability. Discover budget first."
}`;

  return crossSellPrompt;
}

// ============= Stage 2 Prompt Split for Claude =============
function buildStage2PromptMessages(
  extractedSignalsJson: string,
  systemPrompt: string,
  brandContext: string,
  projectContext: string,
  sisterProjectsContext: string,
  leadScoringModel: string,
  personaDefinitions: string,
  privacyRules: string,
  outputConstraints: string,
  concernGeneration: string,
  talkingpointsGeneration: string,
  outputStructure: string,
): { systemPromptMsg: string; userPromptMsg: string } {
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

## PERSONA VALIDATION GUARDRAILS (CRITICAL)

After initial persona detection, VALIDATE against these override rules:

1. **Family Override for Investor Label:**
   If persona = "Pragmatic Investor" or "First-Time Investor" BUT any of these signals present:
   - children_count > 0 OR children_ages is not empty
   - core_motivation contains "family", "children", "school", "kids", "upgrade", "bigger space", "growing family"
   - concerns_extracted mentions "school", "children", "family", "kids"
   → OVERRIDE to "Lifestyle Connoisseur" (if income_tier = "Elite" or "High") or "Aspirant Upgrader" (otherwise)
   
2. **Proxy Buyer Override:**
   If decision_makers_present = "Proxy":
   - Persona classification should be based on the ACTUAL decision maker's profile (if known)
   - If actual_decision_maker profile is unknown, default to "Aspirant Upgrader" and flag for discovery
   - Set persona_confidence = "Low" when proxy buyer detected
   
3. **Core Motivation Alignment Check:**
   The detected persona MUST align with core_motivation:
   - "investment", "rental", "ROI", "appreciation", "returns", "passive income" → Investor personas ONLY
   - "family", "children", "upgrade", "space", "bigger", "school proximity", "growing family" → Family/Lifestyle personas ONLY
   - "retirement", "settlement", "parents", "peaceful", "health" → Settlement Seeker
   - "first home", "newly married", "starting family" → First-Time Buyer
   
4. **Conflicting Signal Log:**
   If persona signals conflict, output:
   - persona_confidence: "Low"
   - persona_conflict_reason: "Investor signal from MQL but family-centric motivation in CRM"

5. Generate outputs using ONLY the extracted signals - do NOT hallucinate additional information

6. For competitor talking points: Use COMPETITOR PRICING REFERENCE with quantitative comparisons
   - Use competitor carpet_stated, price_stated_cr, and price_per_sqft for specific comparisons
   - Calculate differentials: "X% more carpet area at competitive pricing"

7. CROSS-SELL EVALUATION (if sister projects available):
   - Check if lead's requirements match any sister project's cross-sell triggers
   - Consider: budget constraints, RTMI needs, config preference, GCP view interest
   - Generate cross_sell_recommendation if a clear match exists, otherwise set to null

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
   - ⚠️ PRICE VALIDATION: Before adding "Price" to key_concerns, CHECK:
     * If financial_signals.budget_gap_percent ≤ 20 AND customer_mentioned_price_high = false: DO NOT add Price
     * Only add "Price" if gap > 20% OR customer explicitly complained about pricing

5. **NEXT BEST ACTION**: Reference engagement_evidence.next_steps_stated and negotiation_asks
   - Tailor action based on stated next steps and any negotiation requests

CRITICAL: Do not fabricate quotes or facts. Only use evidence that is present (not null). If evidence is null, generate based on signals only.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanatory text.`;

  // Build system prompt with all context
  const systemPromptMsg = `${systemPrompt}

${brandContext}

${projectContext}

${sisterProjectsContext}

${leadScoringModel}

${personaDefinitions}

${privacyRules}

${outputConstraints}

${concernGeneration}

${talkingpointsGeneration}

${stage2Instructions}

${outputStructure}`;

  // User prompt contains the extracted signals
  const userPromptMsg = `# PRE-EXTRACTED SIGNALS (Use these for analysis - NOT raw data)
${extractedSignalsJson}

Analyze the above extracted signals and return a JSON object following the OUTPUT STRUCTURE defined in the system prompt. Return ONLY valid JSON.`;

  return { systemPromptMsg, userPromptMsg };
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
      // Location: MQL > CRM (if MQL not empty), per standardization rules
      residence_location: mqlEnrichment?.location || rawData["Location of Residence"] || null,
      building_name: rawData["Building Name"] || null,
      // Locality Grade: MQL > CRM (if MQL not empty)
      locality_grade: mqlEnrichment?.locality_grade || null,
      income_earners: null,
      years_at_current_residence: null,
      family_size: null,
      children_count: null,
      children_ages: null,
    },
    professional_profile: {
      // Occupation Type: CRM > MQL (always)
      occupation_type: rawData["Occupation"] || null,
      // Designation: CRM > MQL (always) - CORRECTED per standardization rules
      designation: rawData["Designation"] || mqlEnrichment?.designation || null,
      // Employer: MQL > CRM (if MQL not empty) - per standardization rules
      employer: mqlEnrichment?.employer_name || rawData["Place of Work (Company Name)"] || rawData["Place of Work"] || null,
      industry: mqlEnrichment?.industry || rawData["Industry / Sector"] || null,
      business_type: mqlEnrichment?.business_type || null,
      turnover_tier: mqlEnrichment?.turnover_slab || null,
      work_location: rawData["Location of Work"] || rawData["Place of Work"] || null,
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

    // Fetch project and brand metadata with retry logic for transient failures
    let project = null;
    let projectError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await supabase
        .from("projects")
        .select("*, brands(*)")
        .eq("id", projectId)
        .single();
      
      project = result.data;
      projectError = result.error;
      
      if (project && !projectError) {
        break;
      }
      
      console.warn(`Project fetch attempt ${attempt}/${maxRetries} failed:`, projectError?.message || "No data returned");
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 500ms, 1000ms)
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }

    if (projectError || !project) {
      console.error("Error fetching project after retries:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandMetadata = project.brands.metadata;
    const projectMetadata = project.metadata;

    // Fetch sister projects for cross-selling
    const { data: sisterProjects } = await supabase
      .from("sister_projects")
      .select("*")
      .eq("parent_project_id", projectId);

    // Fetch tower inventory for all sister projects + main project (for cross-sell pricing)
    const sisterProjectIds = sisterProjects?.map((sp: any) => sp.id) || [];
    const allProjectIds = [projectId, ...sisterProjectIds];
    
    const { data: towerInventory } = await supabase
      .from("tower_inventory")
      .select("*")
      .in("project_id", allProjectIds);
    
    // Fetch competitor pricing for cross-sell context
    const { data: competitorPricing } = await supabase
      .from("competitor_pricing")
      .select("*");
    
    console.log(`Fetched ${towerInventory?.length || 0} inventory records, ${competitorPricing?.length || 0} competitor records`);

    console.log(`Processing ${leads.length} leads for project ${projectId}, ${sisterProjects?.length || 0} sister projects available`);

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

## FIELD PRECEDENCE RULES (CRITICAL - STANDARDIZED):
Apply these rules when both CRM and MQL data are available:

| Field | Winner | Condition |
|-------|--------|-----------|
| Designation | CRM | Always (CRM has more specific job titles) |
| Occupation Type | CRM | Always |
| Employer | MQL | Only if MQL is not empty (verified from banking records) |
| Location | MQL | Only if MQL is not empty |
| Age | MQL | Only if MQL is not empty |
| Gender | MQL | Only if MQL is not empty |
| Locality Grade | MQL | Only if MQL is not empty |
| Income | MQL | Only if MQL is not empty (use final_income_lacs) |
| Budget | Complementary | Use CRM budget_stated as primary |

If CRM location significantly differs from MQL locality_grade, add "locality_grade" to overridden_fields array`;

    // ============= KNOWLEDGE BASE FIELD EXPLAINER (CRITICAL FOR LLM EXTRACTION) =============
    const knowledgeBaseFieldExplainer = `# KNOWLEDGE BASE FIELD EXPLAINER

This section explains how to interpret fields from project metadata, sister projects, tower inventory, and competitor data. Follow these rules strictly for accurate analysis.

## SECTION 1: PRICING FIELDS (CRITICAL - Multiple Variants)

### Price Field Hierarchy (USE IN THIS ORDER):
| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| closing_min_cr / closing_max_cr | tower_inventory table | All-inclusive price quoted to customer (Base + Floor Rise + Facing Premium + GST + Stamp Duty) | **PRIMARY for budget comparison.** Use this for cross-sell and budget gap calculations. |
| sourcing_min_cr / sourcing_max_cr | tower_inventory table | Developer's sourcing cost (Total Value). | Internal use only - NEVER quote to customer or use in comparisons. |
| price_range_cr in metadata | sister_projects | High-level price range for configurations | Use ONLY if tower_inventory data unavailable. |

### EXTRACTION RULE:
When comparing customer budget against project pricing:
1. ALWAYS use closing_min_cr/closing_max_cr from tower_inventory for the matching typology
2. NEVER use base PSF * carpet area as a proxy - it excludes GST, stamp duty, floor rise
3. If tower_inventory has no data for config, fallback to sister_projects.metadata.configurations[].price_cr

### PSF Reference Fields (For Competitor Comparison Only):
- base_psf: Base price per square foot (before premiums) - use for PSF comparisons
- gcp_premium_psf: Additional ₹1000/sqft for Grand Central Park-facing units
- high_floor_premium_psf: ₹100/floor premium above base floor

## SECTION 2: POSSESSION / OC DATE FIELDS (CRITICAL - Multiple Variants)

### Date Field Hierarchy (USE IN THIS ORDER):
| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| oc_date | tower_inventory table | **ACTUAL expected possession date** per tower (DD-MMM-YY or YYYY-MM-DD) | **PRIMARY for possession timeline matching.** Use this for customer expectation alignment. |
| construction_status | tower_inventory table | Text describing progress (e.g., "32nd Slab - Complete", "OC Received") | Use for construction progress evidence and RTMI detection. |
| current_due_pct | tower_inventory table | Percentage of construction-linked payments due | Higher % = closer to completion (85%+ = near completion) |
| rera_possession | project metadata | Regulatory deadline from RERA registration | **DO NOT use for customer timeline.** Only for compliance reference. |

### RTMI Detection:
- If construction_status = "OC Received": Tower is RTMI (Ready-to-Move-In)
- If current_due_pct >= 95: Tower is near RTMI
- Use Immensa towers (G, H) as RTMI options for immediate possession needs

### EXTRACTION RULE:
The hierarchy is: construction_status "OC Received" (RTMI) > oc_date (actual expected) > rera_possession (regulatory only).
NEVER tell a customer their possession is based on RERA date - always use oc_date.

## SECTION 3: INVENTORY STRUCTURE FIELDS

### Tower Inventory Fields:
| Field Name | Definition | Extraction Rule |
|------------|------------|-----------------|
| tower | Tower identifier (A, B, C, or Estella-A, Primera-B, Immensa-G) | Sister project towers prefixed with project name |
| typology | 1 BHK / 2 BHK / 2.5 BHK / 3 BHK / 4 BHK | Match to customer's config_interested |
| carpet_sqft_min / carpet_sqft_max | Carpet area range in sqft | Match to customer's carpet_area_desired (apply 10% tolerance) |
| car_parking | Single / Tandem / Double | Tandem = 2 cars stacked; Double = 2 separate spots |
| total_inventory | Total units of this typology in tower | For availability context |
| unsold | Currently available units | For urgency/scarcity messaging |
| gcp_view_units | Count of units facing Grand Central Park | For GCP preference matching |
| view_type | "Grand Central Park" / "Creek View" | For view preference matching |

## SECTION 4: COMPETITOR PRICING FIELDS

### Competitor Reference (from competitor_pricing table):
| Field Name | Definition | Usage Rule |
|------------|------------|------------|
| price_min_av / price_max_av | Competitor's price in Lakhs (Agreement Value) | For price comparison - convert to Cr by dividing by 100 |
| avg_psf | Competitor's average PSF (carpet) | For PSF comparison - Eternia typically higher due to premium positioning |
| payment_plans | Available payment plans | For payment flexibility comparison |
| vs_eternia | Comparison note (e.g., "Cheaper 25%") | Direct positioning reference |
| availability | High / Medium / Low | For urgency/scarcity contrast |

### COMPETITOR COUNTER RULES:
1. Lodha Amara: MLCP parking issues, 40+ tower high density (121 families/acre vs our lower density)
2. Dosti Westcounty: Lower quality fittings, Balkum location (farther from metro)
3. Godrej Ascend: Small carpet areas, investor-focused (not end-user)
4. Piramal Vaikunth: Premium pricing, Balkum location, ISKCON niche
5. Oberoi Forestville: New launch risk, unproven delivery timeline

## SECTION 5: TOWNSHIP & SHARED ASSET FIELDS

### Brand-Level Fields:
- gcp_access: All Parkcity projects share access to Grand Central Park (20.5 acres)
- total_project_area: 108 acres total for Parkcity
- township_components: Retail + Residential + Office Space + School + Temple
- entry_exit_points: 4 access points for the township

### Project-Level Cross-Sell Context:
- Eternia: Premium positioning, Olympic amenities, 10 towers
- Estella: Value positioning, 2 BHK + 3 BHK focus, 2 towers, earliest OC 2031
- Primera: Entry-level, 2 BHK only, GCP access, earliest OC 2029
- Immensa: RTMI available (Towers G, H), 4 BHK luxury, GCP-facing

## SECTION 6: CROSS-SELL DECISION RULES

When recommending sister projects:
1. **Budget Check**: closing_min_cr of recommended config ≤ customer budget × 1.20
2. **Possession Check**: oc_date within 8 months of customer expectation (or RTMI if urgent)
3. **Size Check**: carpet_sqft_max ≥ customer desired carpet × 0.90
4. **Room Check**: NEVER recommend fewer rooms; max 1 additional room allowed

### Cross-Sell Priority:
1. Immensa: If customer needs RTMI and budget ≥ ₹4.5Cr for 4 BHK
2. Primera: If customer budget < ₹1.5Cr for 2 BHK
3. Estella: If customer wants 2-3 BHK with double parking and longer timeline acceptable`;

    const inventoryFieldExplainer = `# INVENTORY & POSSESSION DATE FIELDS (CRITICAL)

## Possession Date Rules:
- **OC Date**: The ACTUAL expected possession date for any SKU. USE THIS for possession timeline matching and customer expectations.
- **RERA Possession Date**: Regulatory deadline only - NOT the actual expected possession. DO NOT use for customer timeline matching.

## RULE: Always use OC Date from inventory/sister project metadata for any possession-related analysis or recommendations.

## OC Status Interpretation:
- If oc_received array is populated (e.g., ["A", "B"]): Those towers have received Occupancy Certificate = RTMI available
- If oc_received is empty/null: Project is under construction, use oc_date for expected possession
- RTMI (Ready-to-Move-In): Only applicable if oc_received contains tower(s)`;


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
Trust Signals: ${brandMetadata?.developer?.trust_signals?.join(", ") || "N/A"}

## Township Overview
${brandMetadata?.township ? `
Township: ${brandMetadata.township.name || "N/A"}
Total Area: ${brandMetadata.township.total_area_acres || "N/A"} acres
Total Units: ${brandMetadata.township.total_units || "N/A"}
Phases: ${brandMetadata.township.phases?.join(", ") || "N/A"}
Grand Central Park: ${brandMetadata.township.shared_amenities?.gcp?.area_acres || "N/A"} acres with ${brandMetadata.township.shared_amenities?.gcp?.trees_planted || "N/A"} trees
` : ""}`;

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

## PPS SCORE EXCLUSION RULE (NON-NEGOTIABLE - ABSOLUTE REQUIREMENT):
The PPS Score number MUST NEVER appear in the rating_rationale field. This is a non-negotiable rule that must never be broken under any circumstances.
- ❌ NEVER write "PPS Score: X/100" or any variant
- ❌ NEVER mention specific PPS values (e.g., "scored 85", "PPS of 72", "score of 90")
- ❌ NEVER reference the numerical score in any form
- ✅ Focus ONLY on the qualitative factors: financial capability, intent signals, timeline urgency
- The PPS score is calculated internally and displayed separately in the UI - it must NOT appear in text output

This rule is ABSOLUTE. Violations are unacceptable under any circumstances.

## Other Constraints:
- Rating rationale: 2-3 sentences focusing on key scoring factors (capability, intent, urgency). NO PPS numbers.
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.`;

    const concernGeneration = `# KEY CONCERNS GENERATION (CRITICAL - FOLLOW VALIDATION RULES EXACTLY)

## DEFINITION
Key concerns must be the CUSTOMER'S stated concerns about the project or specific unit.
Focus on: location/connectivity, possession timeline, unit configuration/size, amenities, trust.

## ⚠️ PRICE CONCERN VALIDATION (MANDATORY - HARD RULE)
Before adding "Price" as a concern, you MUST validate ONE of these conditions is TRUE:

CONDITION A: Customer EXPLICITLY mentioned price being too high
- Check financial_signals.customer_mentioned_price_high = true
- Examples of explicit mentions: "too expensive", "out of budget", "pricing gap", "price is high"

CONDITION B: Budget gap is GREATER THAN 20%
- Check financial_signals.budget_gap_percent > 20
- If budget_gap_percent is null, 0, or ≤20: DO NOT add Price concern

❌ DO NOT add "Price" as concern if:
- Budget gap is 20% or less (e.g., 10%, 15%, 18%, 20%)
- Customer did not explicitly complain about pricing
- Gap is within normal negotiation range (≤20%)

✅ ONLY add "Price" as concern if:
- budget_gap_percent > 20, OR
- customer_mentioned_price_high = true

This is a NON-NEGOTIABLE rule. Gaps of 10-20% are NORMAL and should NOT trigger Price concerns.

## CONCERN CATEGORIES (Priority Order for primary_concern_category):
1. "Location" - Connectivity, infrastructure, surroundings, pollution, traffic
2. "Config" - Unit configuration, layout, floor preference, carpet area
3. "Possession" - Delivery timeline, construction delays
4. "Price" - ONLY if validated per rules above (gap >20% OR explicit complaint)
5. "Amenities" - Facilities, amenities concerns
6. "Trust" - Builder reputation concerns
7. "Others" - Anything else

## PRIMARY CONCERN CATEGORY
The SINGLE most important concern. Pick the one that appears FIRST in priority order above.`;

    const talkingpointsGeneration = `# COMPETITOR PRICING REFERENCE (For Stage 3 NBA/TP Framework)
NOTE: Talking points and NBA generation has been moved to Stage 3.
This section provides competitor pricing data for cross-sell recommendation evaluation.

${competitorPricingMatrix}`;

    // Build Sister Projects context for cross-selling (Stage 2 context - OC Date prioritized)
    let sisterProjectsContext = "";
    if (sisterProjects && sisterProjects.length > 0) {
      sisterProjectsContext = `# SISTER PROJECTS FOR CROSS-SELLING

When the lead's requirements don't perfectly match Eternia inventory, consider recommending a sister project from the same township. All sister projects share township benefits (GCP access, connectivity, amenities).

## Available Sister Projects:
${sisterProjects.map((sp: any) => {
  const meta = sp.metadata || {};
  const triggers = sp.cross_sell_triggers || {};
  const configs = meta.configurations || [];
  return `
### ${sp.name} (${sp.relationship_type})
- Possession (OC Date): ${meta.oc_date || "Under construction"}
- RERA Deadline: ${meta.rera_possession || "N/A"}
- OC Status: ${meta.oc_received ? `OC received for towers ${meta.oc_received.join(", ")}` : "Pending"}
- Unique Selling: ${meta.unique_selling || "N/A"}
- Payment Plan: ${meta.payment_plan || "N/A"}
- Configurations:
${configs.map((c: any) => `  - ${c.type}: ${c.carpet_sqft?.[0] || "N/A"}-${c.carpet_sqft?.[1] || "N/A"} sqft, ₹${c.price_cr?.[0] || "N/A"}-${c.price_cr?.[1] || "N/A"} Cr`).join("\n")}

**Cross-Sell Triggers** (Recommend if ANY match):
${triggers.budget_below_cr ? `- Budget below ₹${triggers.budget_below_cr} Cr` : ""}
${triggers.budget_above_cr ? `- Budget above ₹${triggers.budget_above_cr} Cr` : ""}
${triggers.needs_rtmi ? "- Needs Ready-to-Move-In (RTMI)" : ""}
${triggers.wants_gcp_view ? "- Wants GCP-facing units" : ""}
${triggers.config_preference ? `- Prefers ${triggers.config_preference.join("/")}` : ""}
${triggers.decision_timeline_urgent ? "- Urgent decision timeline" : ""}
${triggers.investment_buyer ? "- Investment buyer profile" : ""}
**Talking Point**: "${triggers.talking_point || "N/A"}"
`;
}).join("\n")}

## CROSS-SELL DECISION RULES:
1. Check if lead matches ANY trigger condition for a sister project
2. If multiple matches, prioritize: RTMI needs > Budget constraints > Config preference > GCP views
3. Generate cross_sell_recommendation ONLY if a clear match exists
4. If no match or Eternia is the best fit, set cross_sell_recommendation to null
5. The talking_point should be specific and include price/config details

## CRITICAL: POSSESSION DATE USAGE
- ALWAYS use OC Date (not RERA date) for possession timeline matching
- OC Date = Actual expected delivery date
- RERA Possession = Regulatory deadline (often later than actual)
`;
    }

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
  "rating_rationale": "Brief 2-3 sentence explanation of key scoring factors that determined this lead's rating. Focus on financial capability, intent signals, and timeline urgency. NEVER include the PPS score value - this is a non-negotiable rule.",
  "persona": "Persona label",
  "persona_description": "2-line description focusing on: (1) demographics - age, gender, family composition; (2) financial/professional profile - occupation, designation, income capability; (3) primary buying motivation. For business owners, mention scale abstractly (e.g., 'established manufacturing business') without specific turnover figures. DO NOT include visit details, property preferences, or concerns here.",
  "summary": "Summarize the lead's visit notes: what they are looking for, visit experience/feedback, decision factors and timelines mentioned. DO NOT repeat demographic or professional details. Max 30 words.",
  "key_concerns": ["concern1", "concern2"],
  "concern_categories": ["Price", "Location"],
  "primary_concern_category": "Price",
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
  "mql_data_available": boolean,
  "cross_sell_recommendation": {
    "recommended_project": "Primera" | "Estella" | "Immensa" | null,
    "recommended_config": "2 BHK" | "3 BHK" | "4 BHK" | null,
    "price_range_cr": "₹X.XX - ₹Y.YY Cr",
    "possession_date": "YYYY-MM",
    "reason": "Brief explanation of why this sister project is a better fit (max 25 words)",
    "talking_point": "Specific sales pitch with price/config/possession details (max 25 words)",
    "rules_evaluation": {
      "budget_check": "PASS" | "FAIL" | "N/A",
      "possession_check": "PASS" | "FAIL" | "N/A",
      "size_check": "PASS" | "FAIL" | "N/A",
      "room_check": "PASS" | "FAIL" | "N/A"
    }
  } | null
}

NOTE: Do NOT generate talking_points or next_best_action fields - these are generated by Stage 3.`;

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

      // Rate limit delay: Wait 300ms before Stage 2 API call
      console.log(`Waiting 300ms before Stage 2 for lead ${lead.id}...`);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // ===== STAGE 2: Score & Generate =====
      console.log(`Stage 2 (Generation) starting for lead ${lead.id}`);

      const stage2Prompt = buildStage2Prompt(
        JSON.stringify(extractedSignals, null, 2),
        systemPrompt,
        brandContext,
        projectContext,
        sisterProjectsContext,
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
        revisitDate: excelDateToISOString(lead.rawData?.["Latest Revisit Date"]),
      };
    }

    // Helper function to store analysis result
    async function storeAnalysisResult(result: any, projectId: string, leadsToAnalyze: any[]) {
      if (result.parseSuccess) {
        const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
        if (!lead) return;

        const { error } = await supabase.from("lead_analyses").upsert(
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

        if (error) {
          console.error(`Failed to store analysis for lead ${lead.id}:`, error.message);
        } else {
          console.log(`Stored analysis for lead ${lead.id} with rating ${result.rating}`);
        }
      }
    }

    // Extract chunk info from request (for progress logging)
    const chunkIndex = reqChunkIndex || 1;
    const totalChunks = reqTotalChunks || 1;

    console.log(`Processing chunk ${chunkIndex}/${totalChunks} with ${leadsToAnalyze.length} leads`);

    // ===== PARALLEL STAGE 1 EXTRACTION =====
    console.log(`Starting parallel Stage 1 extraction for ${leadsToAnalyze.length} leads...`);
    
    // Helper function to build MQL section
    function buildMqlSection(mqlEnrichment: any): { mqlSection: string; mqlAvailable: boolean } {
      const mqlAvailable = mqlEnrichment && mqlEnrichment.mql_rating && mqlEnrichment.mql_rating !== "N/A";
      
      if (!mqlAvailable) {
        return { mqlSection: `# MQL DATA: Not available for this lead. Score using CRM data only. Set mql_data_available to false.`, mqlAvailable: false };
      }
      
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
      
      const mqlSection = `# MQL ENRICHMENT DATA (Verified External Data)

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
      
      return { mqlSection, mqlAvailable: true };
    }

    // Run Stage 1 for all leads in parallel with Gemini 3 Flash (fallback to Gemini 2.5 Flash)
    const stage1Results = await Promise.all(
      leadsToAnalyze.map(async (leadWithMql, index) => {
        // Small stagger to avoid burst requests
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100 * index));
        }
        
        const { mqlEnrichment, ...lead } = leadWithMql;
        const leadDataJson = JSON.stringify(lead, null, 2);
        const { mqlSection, mqlAvailable } = buildMqlSection(mqlEnrichment);
        
        let stage1Model = "gemini-3-flash-preview";
        console.log(`Stage 1 (Extraction) starting for lead ${lead.id} using ${stage1Model}`);
        
        const stage1Prompt = buildStage1Prompt(
          leadDataJson,
          mqlSection,
          mqlAvailable,
          crmFieldExplainer,
          mqlFieldExplainer,
        );
        
        let extractedSignals;
        try {
          const stage1Response = await callGemini3FlashAPI(stage1Prompt, googleApiKey!, true);
          extractedSignals = JSON.parse(stage1Response);
          console.log(`Stage 1 complete for lead ${lead.id} using ${stage1Model}`);
        } catch (stage1PrimaryError) {
          console.warn(`Stage 1 primary (${stage1Model}) failed for lead ${lead.id}, trying fallback (gemini-2.5-flash)...`);
          stage1Model = "gemini-2.5-flash (fallback)";
          
          try {
            const stage1Response = await callGemini25FlashAPI(stage1Prompt, googleApiKey!, true);
            extractedSignals = JSON.parse(stage1Response);
            console.log(`Stage 1 complete for lead ${lead.id} using ${stage1Model}`);
          } catch (stage1FallbackError) {
            console.error(`Stage 1 fallback failed for lead ${lead.id}:`, stage1FallbackError);
            extractedSignals = createFallbackExtraction(lead, mqlEnrichment);
            stage1Model = "rule-based fallback";
            console.log(`Using rule-based fallback extraction for lead ${lead.id}`);
          }
        }
        
        return { lead, mqlEnrichment, mqlAvailable, extractedSignals, stage1Model };
      })
    );
    
    console.log(`Parallel Stage 1 complete for all ${leadsToAnalyze.length} leads`);

    // ===== SEQUENTIAL STAGE 2 SCORING (Claude Opus 4.5 via OpenRouter) + STAGE 3 NBA/TP (Gemini 3 Flash) =====
    const freshResults: any[] = [];

    for (let index = 0; index < stage1Results.length; index++) {
      const { lead, mqlEnrichment, mqlAvailable, extractedSignals, stage1Model } = stage1Results[index];

      // Add 300ms delay between Stage 2 calls (not before first one)
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      let stage2Model = "claude-opus-4.5";
      console.log(`Stage 2 (Scoring & Generation) starting for lead ${lead.id} using ${stage2Model} (${index + 1}/${stage1Results.length})`);

      // Build prompts for Claude (OpenRouter format: system + user messages)
      const { systemPromptMsg, userPromptMsg } = buildStage2PromptMessages(
        JSON.stringify(extractedSignals, null, 2),
        systemPrompt,
        brandContext,
        projectContext,
        sisterProjectsContext,
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
        const stage2Response = await callOpenRouterAPI(systemPromptMsg, userPromptMsg);
        // Claude may return JSON wrapped in markdown code blocks - strip them
        let cleanedResponse = stage2Response.trim();
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.slice(7);
        } else if (cleanedResponse.startsWith("```")) {
          cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith("```")) {
          cleanedResponse = cleanedResponse.slice(0, -3);
        }
        analysisResult = JSON.parse(cleanedResponse.trim());
        console.log(`Stage 2 complete for lead ${lead.id} using ${stage2Model}`);
      } catch (stage2PrimaryError) {
        console.warn(`Stage 2 primary (${stage2Model}) failed for lead ${lead.id}, trying fallback (gemini-2.5-pro)...`);
        stage2Model = "gemini-2.5-pro (fallback)";
        
        // Build the original combined prompt for Gemini fallback
        const stage2Prompt = buildStage2Prompt(
          JSON.stringify(extractedSignals, null, 2),
          systemPrompt,
          brandContext,
          projectContext,
          sisterProjectsContext,
          leadScoringModel,
          personaDefinitions,
          privacyRules,
          outputConstraints,
          concernGeneration,
          talkingpointsGeneration,
          outputStructure,
        );
        
        try {
          const stage2Response = await callGeminiAPI(stage2Prompt, googleApiKey!, true);
          analysisResult = JSON.parse(stage2Response);
          console.log(`Stage 2 complete for lead ${lead.id} using ${stage2Model}`);
        } catch (stage2FallbackError) {
          parseSuccess = false;
          stage2Model = "rule-based fallback";
          console.error(`Stage 2 fallback failed for lead ${lead.id}:`, stage2FallbackError);
          analysisResult = {
            ai_rating: "Warm",
            rating_confidence: "Low",
            rating_rationale: "Analysis completed with limited structure",
            summary: extractedSignals.visit_notes_summary || "Unable to analyze lead",
            mql_data_available: mqlAvailable,
          };
        }
      }

      // Apply MQL-based final score adjustment (internal calibration)
      if (parseSuccess && analysisResult.pps_score !== undefined) {
        const mqlRating = mqlEnrichment?.mql_rating || "N/A";
        let adjustedPpsScore = analysisResult.pps_score;

        switch (mqlRating) {
          case "P0":
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

      // ===== STAGE 2.5: CROSS-SELL RECOMMENDATION (Gemini 3 Flash) =====
      let stage25Model = "gemini-3-flash-preview";
      if (parseSuccess && sisterProjects && sisterProjects.length > 0) {
        console.log(`Stage 2.5 (Cross-Sell) starting for lead ${lead.id} using ${stage25Model}`);
        
        try {
          // Add small delay before cross-sell call
          await new Promise((resolve) => setTimeout(resolve, 150));
          
          const crossSellPrompt = buildCrossSellPrompt(
            analysisResult,
            extractedSignals,
            sisterProjects,
            projectMetadata,
            towerInventory || [],
            competitorPricing || []
          );
          
          const crossSellResult = await callCrossSellAPI(crossSellPrompt, googleApiKey!);
          
          // Merge cross-sell recommendation into analysis result
          if (crossSellResult?.cross_sell_recommendation) {
            analysisResult.cross_sell_recommendation = crossSellResult.cross_sell_recommendation;
            console.log(`Stage 2.5 complete for lead ${lead.id}: Recommended ${crossSellResult.cross_sell_recommendation.recommended_project}`);
          } else {
            analysisResult.cross_sell_recommendation = null;
            console.log(`Stage 2.5 complete for lead ${lead.id}: No cross-sell recommendation. ${crossSellResult?.evaluation_log || ""}`);
          }
        } catch (crossSellError) {
          stage25Model = "skipped (error)";
          console.warn(`Stage 2.5 failed for lead ${lead.id}:`, crossSellError);
          analysisResult.cross_sell_recommendation = null;
        }
      } else {
        stage25Model = "skipped (no sister projects or Stage 2 failed)";
      }

      // ===== PRE-STAGE 3: DETERMINISTIC NBA/TP SELECTION =====
      let preSelectedNba: any = null;
      let preSelectedTpIds: string[] = [];
      let preSelectedObjection: string | null = null;

      if (parseSuccess) {
        try {
          const preVisitComments = lead.rawData?.["Visit Comments"] || 
                                   lead.rawData?.["Remarks in Detail"] || 
                                   lead.rawData?.["Site Re-Visit Comment"] || "";
          
          const normalizedPersona = normalizePersona(analysisResult.persona);
          const detectedObjections = detectObjectionCategories(preVisitComments, extractedSignals);
          const safetyPre = checkSafetyConditions(analysisResult.persona, extractedSignals);

          if (safetyPre.triggered && safetyPre.overrideNbaId) {
            // Safety override: use safety NBA and its linked TPs
            const safetyNba = getNBARuleDef(safetyPre.overrideNbaId);
            if (safetyNba) {
              preSelectedNba = safetyNba;
              preSelectedTpIds = safetyNba.linked_talking_points || [];
              preSelectedObjection = `safety:${safetyPre.safetyRule}`;
            }
          } else if (detectedObjections && detectedObjections.length > 0) {
            // Matrix lookup: map primary objection to matrix key, then look up entry
            const primaryObjection = detectedObjections[0];
            const matrixObjection = mapToMatrixObjection(primaryObjection);
            if (matrixObjection) {
              const matrixEntry = lookupMatrixEntry(normalizedPersona, matrixObjection);
              if (matrixEntry) {
                preSelectedNba = getNBARuleDef(matrixEntry.nba_id);
                preSelectedTpIds = matrixEntry.tp_ids || [];
                preSelectedObjection = matrixObjection;
              }
            }
          }

          console.log(`Pre-Stage3 deterministic selection for lead ${lead.id}: persona=${normalizedPersona}, objection=${preSelectedObjection}, nba=${preSelectedNba?.nba_id || "none"}, tps=[${preSelectedTpIds.join(",")}]`);
        } catch (preSelectionError) {
          console.warn(`Pre-Stage3 selection failed for lead ${lead.id}, falling back to LLM selection:`, preSelectionError);
          preSelectedNba = null;
          preSelectedTpIds = [];
        }
      }

      // ===== STAGE 3: NBA & TALKING POINTS GENERATION (Gemini 3 Flash) =====
      let stage3Model = "gemini-3-flash-preview";
      if (parseSuccess) {
        console.log(`Stage 3 (NBA/TP) starting for lead ${lead.id} using ${stage3Model}`);
        
        // Add 200ms delay before Stage 3
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        // Get visit comments from raw data
        const visitComments = lead.rawData?.["Visit Comments"] || 
                             lead.rawData?.["Remarks in Detail"] || 
                             lead.rawData?.["Site Re-Visit Comment"] || "";
        
        try {
          const stage3Prompt = buildStage3Prompt(
            analysisResult,
            extractedSignals,
            visitComments,
            towerInventory || [],
            competitorPricing || [],
            projectMetadata,
            preSelectedNba,
            preSelectedTpIds
          );
          
          const stage3Response = await callGemini3FlashAPI(stage3Prompt, googleApiKey!, true);
          const stage3Result = JSON.parse(stage3Response);
          console.log(`Stage 3 complete for lead ${lead.id} using ${stage3Model}`);
          
          // Code-level safety validation (override LLM if needed)
          const safetyCheck = checkSafetyConditions(analysisResult.persona, extractedSignals);
          if (safetyCheck.triggered && stage3Result.safety_check_triggered === null) {
            const overrideNba = getNBARuleDef(safetyCheck.overrideNbaId || "");
            if (overrideNba) {
              stage3Result.next_best_action = {
                nba_id: overrideNba.nba_id,
                action_type: overrideNba.action_category as NBAActionType,
                action: overrideNba.specific_action,
                escalation_trigger: overrideNba.escalation_trigger,
                fallback_action: overrideNba.fallback_action,
              };
              stage3Result.safety_check_triggered = safetyCheck.safetyRule;
            }
          }
          
          // Merge Stage 3 results into analysis result
          analysisResult.next_best_action = stage3Result.next_best_action;
          analysisResult.talking_points = stage3Result.talking_points;
          analysisResult.objection_categories_detected = stage3Result.objection_categories_detected;
          analysisResult.primary_objection = stage3Result.primary_objection;
          analysisResult.secondary_objections = stage3Result.secondary_objections;
          analysisResult.safety_check_triggered = stage3Result.safety_check_triggered;
          
        } catch (stage3PrimaryError) {
          console.warn(`Stage 3 primary (${stage3Model}) failed for lead ${lead.id}, trying fallback (gemini-2.5-flash)...`);
          stage3Model = "gemini-2.5-flash (fallback)";
          
          try {
            const stage3Prompt = buildStage3Prompt(
              analysisResult,
              extractedSignals,
              lead.rawData?.["Visit Comments"] || "",
              towerInventory || [],
              competitorPricing || [],
              projectMetadata,
              preSelectedNba,
              preSelectedTpIds
            );
            
            const stage3Response = await callGemini25FlashAPI(stage3Prompt, googleApiKey!, true);
            const stage3Result = JSON.parse(stage3Response);
            console.log(`Stage 3 complete for lead ${lead.id} using ${stage3Model}`);
            
            // Code-level safety validation (override LLM if needed)
            const safetyCheck = checkSafetyConditions(analysisResult.persona, extractedSignals);
            if (safetyCheck.triggered && stage3Result.safety_check_triggered === null) {
              const overrideNba = getNBARuleDef(safetyCheck.overrideNbaId || "");
              if (overrideNba) {
                stage3Result.next_best_action = {
                  nba_id: overrideNba.nba_id,
                  action_type: overrideNba.action_category as NBAActionType,
                  action: overrideNba.specific_action,
                  escalation_trigger: overrideNba.escalation_trigger,
                  fallback_action: overrideNba.fallback_action,
                };
                stage3Result.safety_check_triggered = safetyCheck.safetyRule;
              }
            }
            
            // Merge Stage 3 results into analysis result
            analysisResult.next_best_action = stage3Result.next_best_action;
            analysisResult.talking_points = stage3Result.talking_points;
            analysisResult.objection_categories_detected = stage3Result.objection_categories_detected;
            analysisResult.primary_objection = stage3Result.primary_objection;
            analysisResult.secondary_objections = stage3Result.secondary_objections;
            analysisResult.safety_check_triggered = stage3Result.safety_check_triggered;
            
          } catch (stage3FallbackError) {
            stage3Model = "skipped (using Stage 2 output)";
            console.error(`Stage 3 fallback failed for lead ${lead.id}:`, stage3FallbackError);
            // Keep Stage 2 output without talking_points/NBA enhancement
          }
        }
      } else {
        stage3Model = "skipped (Stage 2 failed)";
      }

      // ===== STAGE 4: OUTPUT EVALUATOR (Claude Sonnet 4.5 via OpenRouter) =====
      let stage4Model = "claude-sonnet-4.5";
      const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
      if (parseSuccess && analysisResult.next_best_action && openRouterKey) {
        console.log(`Stage 4 (Evaluator) starting for lead ${lead.id} using ${stage4Model}`);
        
        // Add 200ms delay before Stage 4
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        try {
          const evaluatedOutput = await evaluateOutputs(
            {
              persona: analysisResult.persona,
              next_best_action: analysisResult.next_best_action,
              talking_points: analysisResult.talking_points,
              objection_categories_detected: analysisResult.objection_categories_detected,
              primary_objection: analysisResult.primary_objection,
              safety_check_triggered: analysisResult.safety_check_triggered,
            },
            analysisResult.cross_sell_recommendation,
            extractedSignals,
            (towerInventory || []) as TowerInventoryRow[],
            (competitorPricing || []) as CompetitorPricingRow[],
            (sisterProjects || []) as SisterProjectRow[],
            projectMetadata || {},
            openRouterKey
          );
          
          if (evaluatedOutput) {
            // Merge validated outputs back into analysis result
            if (evaluatedOutput.final_output?.next_best_action) {
              analysisResult.next_best_action = evaluatedOutput.final_output.next_best_action;
            }
            if (evaluatedOutput.final_output?.talking_points) {
              analysisResult.talking_points = evaluatedOutput.final_output.talking_points;
            }
            // Update cross-sell if evaluator made corrections
            if (evaluatedOutput.final_output?.cross_sell_recommendation !== undefined) {
              analysisResult.cross_sell_recommendation = evaluatedOutput.final_output.cross_sell_recommendation;
            }
            
            // Store validation audit trail
            analysisResult.validation_summary = evaluatedOutput.validation_summary;
            analysisResult.corrections_made = evaluatedOutput.corrections_made;
            
            console.log(`Stage 4 complete for lead ${lead.id}: ${evaluatedOutput.corrections_made?.length || 0} corrections made`);
          } else {
            stage4Model = "skipped (evaluator returned null)";
            console.log(`Stage 4 skipped for lead ${lead.id}: evaluator returned null`);
          }
        } catch (stage4Error) {
          stage4Model = "skipped (error)";
          console.warn(`Stage 4 failed for lead ${lead.id}:`, stage4Error);
          // Continue with Stage 3 output without validation
        }
      } else {
        stage4Model = parseSuccess ? "skipped (no NBA output)" : "skipped (Stage 3 failed)";
      }

      // Add models_used metadata to track which model processed each stage
      analysisResult.models_used = {
        stage1: stage1Model,
        stage2: stage2Model,
        stage2_5: stage25Model,
        stage3: stage3Model,
        stage4_evaluator: stage4Model,
      };

      const result = {
        leadId: lead.id,
        rating: analysisResult.ai_rating,
        insights: analysisResult.summary || analysisResult.rating_rationale,
        fullAnalysis: analysisResult,
        parseSuccess,
        fromCache: false,
        revisitDate: excelDateToISOString(lead.rawData?.["Latest Revisit Date"]),
      };

      freshResults.push(result);

      // Store result immediately (enables partial progress)
      await storeAnalysisResult(result, projectId, leadsToAnalyze);
    }

    const allResults = [...cachedResults, ...freshResults];
    const successCount = allResults.filter((r) => r.parseSuccess).length;

    console.log(`Analysis complete: ${successCount}/${allResults.length} successful (Gemini 3 Flash Stage 1/2.5/3 + Claude Opus 4.5 Stage 2)`);

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
