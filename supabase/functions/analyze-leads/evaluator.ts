// ============= STAGE 4: OUTPUT EVALUATOR =============
// Validates and auto-corrects TP, NBA, and Cross-Sell outputs against the internal knowledge base
// Uses Claude Sonnet 4.5 via OpenRouter

import {
  TALKING_POINTS,
  NBA_RULES,
  PERSONA_OBJECTION_MATRIX,
  type TalkingPointDef,
  type NBARule,
  type MatrixEntry,
  type ObjectionCategory,
  type NBAActionType,
} from "./nba-framework.ts";

// ============= TYPE DEFINITIONS =============

export interface TowerInventoryRow {
  project_id: string;
  tower: string;
  typology: string;
  carpet_sqft_min: number | null;
  carpet_sqft_max: number | null;
  closing_min_cr: number | null;
  closing_max_cr: number | null;
  oc_date: string | null;
  construction_status: string | null;
  unsold: number | null;
  sold: number | null;
  total_inventory: number | null;
  view_type: string | null;
  gcp_view_units: number | null;
}

export interface CompetitorPricingRow {
  competitor_name: string;
  project_name: string;
  config: string;
  carpet_sqft_min: number | null;
  carpet_sqft_max: number | null;
  price_min_av: number | null;
  price_max_av: number | null;
  avg_psf: number | null;
  vs_eternia: string | null;
  payment_plans: string | null;
  availability: string | null;
  sample_flat: boolean | null;
}

export interface CompetitorStrategicRow {
  competitor: string;
  target_persona: string;
  key_usp: string;
  primary_weakness: string;
  what_they_say: string;
  counter_argument: string;
  win_rate: string;
}

export interface SisterProjectRow {
  id: string;
  name: string;
  metadata: Record<string, any>;
  cross_sell_triggers: Record<string, any>;
}

export interface EvaluatorKnowledgeBase {
  // Framework definitions (static)
  talkingPoints: Record<string, TalkingPointDef>;
  nbaRules: Record<string, NBARule>;
  personaMatrix: Record<string, Record<string, MatrixEntry>>;
  
  // Project data (from Master Knowledge Base)
  towerInventory: TowerInventoryRow[];
  competitorPricing: CompetitorPricingRow[];
  competitorStrategic: CompetitorStrategicRow[];
  sisterProjects: SisterProjectRow[];
  projectMetadata: Record<string, any>;
}

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: "error" | "warning";
}

export interface ValidationSummary {
  tp_validation: { passed: boolean; issues: ValidationIssue[] };
  nba_validation: { passed: boolean; issues: ValidationIssue[] };
  cross_sell_validation: { passed: boolean; issues: ValidationIssue[] };
  competitor_validation: { passed: boolean; issues: ValidationIssue[] };
}

export interface Correction {
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

export interface EvaluatorResponse {
  validation_summary: ValidationSummary;
  corrections_made: Correction[];
  final_output: {
    next_best_action: any;
    talking_points: any[];
    cross_sell_recommendation: any | null;
  };
}

// ============= KNOWLEDGE BASE FORMATTERS =============

function formatTowerInventory(inventory: TowerInventoryRow[]): string {
  if (!inventory || inventory.length === 0) return "No tower inventory data available.";
  
  // Group by project
  const byProject: Record<string, TowerInventoryRow[]> = {};
  for (const row of inventory) {
    const projectId = row.project_id || "unknown";
    if (!byProject[projectId]) byProject[projectId] = [];
    byProject[projectId].push(row);
  }
  
  let output = "";
  for (const [projectId, rows] of Object.entries(byProject)) {
    const projectName = projectId.toLowerCase().includes("eternia") ? "Eternia" :
                       projectId.toLowerCase().includes("primera") ? "Primera" :
                       projectId.toLowerCase().includes("estella") ? "Estella" :
                       projectId.toLowerCase().includes("immensa") ? "Immensa" : projectId;
    
    output += `\n### ${projectName}\n`;
    output += "| Tower | Typology | Carpet (sqft) | Closing Min (Cr) | Closing Max (Cr) | OC Date | Construction Status | Unsold |\n";
    output += "|-------|----------|---------------|------------------|------------------|---------|---------------------|--------|\n";
    
    for (const row of rows) {
      const carpet = row.carpet_sqft_min && row.carpet_sqft_max 
        ? `${row.carpet_sqft_min}-${row.carpet_sqft_max}` 
        : row.carpet_sqft_min || row.carpet_sqft_max || "N/A";
      output += `| ${row.tower || "?"} | ${row.typology || "N/A"} | ${carpet} | ₹${row.closing_min_cr?.toFixed(2) || "N/A"} | ₹${row.closing_max_cr?.toFixed(2) || "N/A"} | ${row.oc_date || "TBD"} | ${row.construction_status || "N/A"} | ${row.unsold ?? "N/A"} |\n`;
    }
  }
  
  return output;
}

function formatCompetitorPricing(competitors: CompetitorPricingRow[]): string {
  if (!competitors || competitors.length === 0) return "No competitor pricing data available.";
  
  // Group by competitor
  const byCompetitor: Record<string, CompetitorPricingRow[]> = {};
  for (const row of competitors) {
    const name = row.competitor_name || "Unknown";
    if (!byCompetitor[name]) byCompetitor[name] = [];
    byCompetitor[name].push(row);
  }
  
  let output = "";
  for (const [competitor, rows] of Object.entries(byCompetitor)) {
    output += `\n### ${competitor}\n`;
    output += "| Config | Carpet (sqft) | Price Min (L) | Price Max (L) | PSF | vs Eternia |\n";
    output += "|--------|---------------|---------------|---------------|-----|------------|\n";
    
    for (const row of rows) {
      const carpet = row.carpet_sqft_min && row.carpet_sqft_max 
        ? `${row.carpet_sqft_min}-${row.carpet_sqft_max}` 
        : row.carpet_sqft_min || row.carpet_sqft_max || "N/A";
      const priceMin = row.price_min_av ? (row.price_min_av / 100000).toFixed(0) : "N/A";
      const priceMax = row.price_max_av ? (row.price_max_av / 100000).toFixed(0) : "N/A";
      output += `| ${row.config || "N/A"} | ${carpet} | ₹${priceMin}L | ₹${priceMax}L | ₹${row.avg_psf?.toLocaleString() || "N/A"} | ${row.vs_eternia || "N/A"} |\n`;
    }
  }
  
  return output;
}

function formatCompetitorStrategic(strategic: CompetitorStrategicRow[]): string {
  if (!strategic || strategic.length === 0) return "No competitor strategic data available.";
  
  let output = "| Competitor | Primary Weakness | Counter-Argument | Win Rate |\n";
  output += "|------------|------------------|------------------|----------|\n";
  
  for (const row of strategic) {
    output += `| ${row.competitor} | ${row.primary_weakness} | ${row.counter_argument} | ${row.win_rate} |\n`;
  }
  
  return output;
}

function formatFrameworkRules(): string {
  // TP Selection Rules
  let tpRules = `## TALKING POINT SELECTION VALIDITY RULES

1. Every \`tp_id\` MUST exist in the TALKING_POINTS definitions
2. The TP-ID MUST be linked to the selected NBA-ID in \`NBA_RULES.linked_talking_points\`
3. If not linked, verify it appears in \`PERSONA_OBJECTION_MATRIX\` for the detected persona + objection

## VALID TP-IDs (${Object.keys(TALKING_POINTS).length} total)
${Object.keys(TALKING_POINTS).join(", ")}

## VALID NBA-IDs (${Object.keys(NBA_RULES).length} total)
${Object.keys(NBA_RULES).join(", ")}`;

  return tpRules;
}

// ============= EVALUATOR PROMPT BUILDER =============

export function buildEvaluatorPrompt(
  stage3Output: any,
  crossSellOutput: any,
  extractedSignals: any,
  knowledgeBase: EvaluatorKnowledgeBase,
  leadContext: {
    persona: string;
    objections_detected: string[];
    budget_stated: number | null;
    timeline: string | null;
  },
  stage3Variant: "matrix" | "scenario" = "matrix"
): string {
  const systemPrompt = `# OUTPUT EVALUATOR - TP, NBA & CROSS-SELL VALIDATION

You are a quality assurance specialist for real estate sales AI. Your task is to validate and correct generated outputs against the internal knowledge base and framework rules.

## YOUR ROLE
1. **VALIDATE**: Check if outputs comply with framework rules and knowledge base
2. **IDENTIFY**: Flag any mismatches, factual errors, or competitor misinformation
3. **CORRECT**: Modify incorrect outputs to align with the knowledge base
4. **ENHANCE**: Strengthen competitor counter-arguments with specific data
5. **EXPLAIN**: Provide reasoning for each correction

## CRITICAL RULES - DO NOT SKIP

### Rule 1: TP-ID Validity
- Every tp_id in talking_points MUST exist in TALKING_POINTS definitions
- If a TP-ID doesn't exist, replace with the closest valid TP-ID

### Rule 2: TP Content Accuracy
- Numeric data (prices, areas, dates) MUST come from tower_inventory or competitor_pricing
- NEVER fabricate specific prices or dates not in the knowledge base
- Cross-sell prices must use closing_min_cr / closing_max_cr from inventory

### Rule 3: Competitor Objection Validation (CRITICAL)
When a talking point references a competitor:
1. Validate pricing claims against competitor_pricing table
2. Ensure counter-arguments align with documented weaknesses
3. Include specific PSF comparisons where relevant
4. CORRECT any inaccurate competitor claims with real data

**Example corrections:**
- If TP says "Lodha Amara 2BHK at ₹1.3Cr" but data shows ₹1.1-1.15Cr → CORRECT
- If TP says "Godrej has similar pricing" but data shows 10% higher PSF → CORRECT with specifics
- If competitor counter-argument is generic → ENHANCE with specific weakness from knowledge base

### Rule 4: Cross-Sell Budget Validation
Using tower_inventory data:
- Find the recommended_project + recommended_config combination
- Get the actual closing_min_cr from inventory
- IF closing_min_cr > (lead_budget × 1.20) THEN REJECT
- CORRECT: Either null the recommendation OR suggest valid alternative

### Rule 5: Cross-Sell Possession Validation
Using tower_inventory.oc_date:
- Calculate months between oc_date and lead's stated expectation
- IF difference > 8 months THEN FLAG
- Exception: If lead has no stated urgency, this rule passes

### Rule 6: Cross-Sell Config Validation
- Room count: recommended_config rooms must be within [desired-0, desired+1]
- Carpet area: inventory carpet_sqft_min must be ≥ (desired_carpet × 0.90)

### Rule 7: Safety Rule Override
IF the original output ignored a safety condition:
- 75+ with RTMI need → MUST use NBA-ESC-004, redirect to resale
- Proxy buyer → MUST use NBA-COM-010, push for decision-maker visit
CORRECT the NBA if safety rule was violated

### Rule 8: Investor Persona TP Mismatch
IF persona = "Pragmatic Investor" or "First-Time Investor":
- talking_points MUST include at least one TP-INV-* (Investment category)
- MUST NOT include family-centric arguments (school, kids, lifestyle)
CORRECT: Replace with TP-INV-006 or appropriate investment TP

### Rule 9: NBA-ID Validity
- The nba_id MUST exist in NBA_RULES definitions
- The trigger_condition in the rule must be plausibly satisfied by the lead context
- If the NBA-ID doesn't match the lead's objection category, FLAG as mismatch

### Rule 10: PPS Score Exclusion in Rating Rationale (NON-NEGOTIABLE)
The PPS Score number MUST NEVER appear in any text output field, especially rating_rationale.
- If rating_rationale contains "PPS Score", "PPS: ", "scored X/100", or any numerical PPS reference → REMOVE IT
- This is a non-negotiable rule that must never be broken under any circumstances
- CORRECT: Replace with qualitative description of scoring factors (capability, intent, urgency)
- The PPS score is displayed separately in the UI and must not appear in text fields
- Add to corrections_made array with reason: "PPS score removed from rationale per non-negotiable rule"

### Rule 11: Budget Standardization Validation 
**VALIDATION RULES:**
- If budget_stated >= 10 AND <= 100 → WARNING: Likely in Lakhs, should be divided by 100
- VALID range: ₹30 Lac to ₹20 Cr - typical residential budget)
- null or 0: WARNING - No budget extracted from CRM comments

**EXPECTED STANDARDIZED FORMAT:**
- ₹82.5 Lacs → budget_stated_cr: 0.825 (display as "₹ 82.5 Lacs")
- ₹1.25 Cr → budget_stated_cr: 1.25 (display as "₹ 1.25 Cr")
- ₹2 Cr → budget_stated_cr: 2.0 (display as "₹ 2.00 Cr")`;

  const knowledgeBaseSection = `
## KNOWLEDGE BASE (SOURCE OF TRUTH)

### TOWER INVENTORY (Eternia + Sister Projects)
${formatTowerInventory(knowledgeBase.towerInventory)}

### COMPETITOR PRICING
${formatCompetitorPricing(knowledgeBase.competitorPricing)}

### COMPETITOR STRATEGIC POSITIONING
${formatCompetitorStrategic(knowledgeBase.competitorStrategic)}

${formatFrameworkRules()}`;

  const competitorEnhancementRules = `
## COMPETITOR OBJECTION ENHANCEMENT RULES

When validating competitor-related talking points:

### Lodha Amara
- 2BHK: ₹92L-135L (600-830 sqft carpet), PSF: ₹16,500-18,000
- 3BHK: ₹160L-200L (865-1077 sqft carpet), PSF: ₹17,500
- Density: 4864 units across 40+ towers = 121 families/acre
- Eternia: 2166 units in 10 towers (within 108-acre township)
- Primary Weakness: High density, MLCP parking, LIG residents, pool crowding
- Counter: "Low density = exclusivity. 20-acre park vs 2-acre. You pay ₹5L more for 5 years of peace"

### Dosti Westcounty
- 2BHK: ₹110L-157L (552-757 sqft), PSF: ₹18,000
- Primary Weakness: Balkum location (vs Kolshet), quality concerns, leakage issues
- Counter: "Brand legacy (55 years vs Dosti issues), Geberit fittings, Kolshet > Balkum"

### Godrej Ascend
- 2BHK: ₹95L-124L (571-620 sqft), PSF: ₹18,000-19,000
- 3BHK: ₹127L-226L (755-897 sqft), PSF: ₹20,000-22,400
- Primary Weakness: Small carpet areas, UC risk, investor-focused not end-use
- Counter: "GCP (20 acres) > Sports Arena. Active lifestyle. Eternia = end-use focus"

### Piramal Vaikunth
- 2BHK: ₹111L-189L (495-811 sqft), PSF: ₹22,000 (Premium)
- Primary Weakness: Some clusters compact, Balkum location, passive spiritual
- Counter: "Active living > Passive spiritual. GCP larger. Kolshet > Balkum for metro"

### Oberoi Forestville
- 3BHK: ₹188L-250L (1045-1052 sqft), PSF: ₹19,000
- Primary Weakness: New entrant, less track record, no sample flats yet
- Counter: "Kalpataru 55 years delivery vs Oberoi new entry. Roots proves quality. GCP operational"

### ENHANCEMENT RULES:
- "Competitor is crowded" → "Lodha Amara: 40+ towers, pool always crowded. Eternia: 10 towers with Olympic pool at 3x better ratio"
- "We have better value" → "Our ₹23K PSF vs Godrej ₹20K but with 20-acre GCP access"
- "Better possession" → Validate against actual OC dates from inventory`;

  const inputSection = `
## INPUT TO EVALUATE

### Stage 3 Output (NBA & Talking Points)
\`\`\`json
${JSON.stringify(stage3Output, null, 2)}
\`\`\`

### Stage 2.5 Output (Cross-Sell Recommendation)
\`\`\`json
${JSON.stringify(crossSellOutput, null, 2)}
\`\`\`

### Lead Context
- Persona: ${leadContext.persona}
- Objections Detected: ${leadContext.objections_detected?.join(", ") || "None"}
- Budget Stated: ${leadContext.budget_stated ? `₹${leadContext.budget_stated} Cr` : "Not stated"}
- Timeline: ${leadContext.timeline || "Not stated"}

### Extracted Signals Summary
\`\`\`json
${JSON.stringify({
  demographics: extractedSignals?.demographics,
  financial_signals: extractedSignals?.financial_signals,
  property_preferences: extractedSignals?.property_preferences,
  competitor_intelligence: extractedSignals?.competitor_intelligence,
}, null, 2)}
\`\`\``;

  const outputStructure = `
## OUTPUT FORMAT

Return ONLY a valid JSON object with this EXACT structure:
{
  "validation_summary": {
    "tp_validation": { 
      "passed": boolean, 
      "issues": [{ "field": "string", "issue": "string", "severity": "error" | "warning" }] 
    },
    "nba_validation": { 
      "passed": boolean, 
      "issues": [{ "field": "string", "issue": "string", "severity": "error" | "warning" }] 
    },
    "cross_sell_validation": { 
      "passed": boolean, 
      "issues": [{ "field": "string", "issue": "string", "severity": "error" | "warning" }] 
    },
    "competitor_validation": { 
      "passed": boolean, 
      "issues": [{ "field": "string", "issue": "string", "severity": "error" | "warning" }] 
    }
  },
  "corrections_made": [
    {
      "field": "talking_points[0].point",
      "original": "Original text that was incorrect",
      "corrected": "Corrected text with accurate data",
      "reason": "Explanation of why this was corrected"
    }
  ],
  "final_output": {
    "next_best_action": {
      "nba_id": "NBA-XXX-XXX",
      "action_type": "COMMUNICATION" | "CONTENT/COLLATERAL" | "OFFER" | "FOLLOW-UP" | "ESCALATION",
      "action": "Specific action max 15 words",
      "escalation_trigger": "When to escalate",
      "fallback_action": "Alternative if primary fails"
    },
    "talking_points": [
      {
        "tp_id": "TP-XXX-XXX",
        "type": "What to highlight" | "Competitor handling" | "Objection handling",
        "point": "Corrected point max 20 words with accurate data",
        "source_text": "Original framework text"
      }
    ],
    "cross_sell_recommendation": {
      "recommended_project": "Primera" | "Estella" | "Immensa" | null,
      "recommended_config": "2 BHK" | "3 BHK" | "4 BHK" | null,
      "price_range_cr": "string",
      "possession_date": "string",
      "reason": "string",
      "talking_point": "string",
      "rules_evaluation": {
        "budget_check": "PASS" | "FAIL",
        "possession_check": "PASS" | "FAIL",
        "size_check": "PASS" | "FAIL",
        "room_check": "PASS" | "FAIL"
      }
    } | null
  }
}

IMPORTANT:
- If no corrections needed, return the original output unchanged with empty corrections_made array
- If cross_sell fails validation, set cross_sell_recommendation to null
- All corrections must reference actual data from the knowledge base
- Keep talking points under 20 words and NBA actions under 15 words

## PPS SCORE VALIDATION (NON-NEGOTIABLE - ABSOLUTE REQUIREMENT)
Before returning final_output, verify:
- rating_rationale does NOT contain "PPS Score", "PPS:", "scored X/100", or any numerical score reference
- If found, CORRECT by removing the PPS reference and keeping only qualitative factors
- Add to corrections_made array with reason: "PPS score removed from rationale per non-negotiable rule"
- This validation is ABSOLUTE and must never be skipped`;

  return `${systemPrompt}

${knowledgeBaseSection}

${competitorEnhancementRules}

${inputSection}

${outputStructure}`;
}

// ============= OPENROUTER API CALL =============

export async function runEvaluator(
  prompt: string,
  openRouterApiKey: string
): Promise<EvaluatorResponse> {
  console.log("Stage 4: Calling OpenRouter Evaluator (Claude Sonnet 4.5)...");
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lovable.dev",
      "X-Title": "Lead Analysis Evaluator",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter Evaluator error:", response.status, errorText);
    throw new Error(`OpenRouter Evaluator failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter Evaluator response");
  }

  // Parse JSON response - handle markdown code blocks
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith("```json")) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith("```")) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith("```")) {
    cleanedContent = cleanedContent.slice(0, -3);
  }

  try {
    const result = JSON.parse(cleanedContent.trim()) as EvaluatorResponse;
    console.log(`Stage 4 complete: ${result.corrections_made?.length || 0} corrections made`);
    return result;
  } catch (parseError) {
    console.error("Failed to parse evaluator response:", parseError);
    console.error("Raw response:", cleanedContent.substring(0, 500));
    throw new Error("Failed to parse evaluator JSON response");
  }
}

// ============= STATIC COMPETITOR STRATEGIC DATA =============
// Extracted from Master Knowledge Base Excel for injection into evaluator

export const COMPETITOR_STRATEGIC_DATA: CompetitorStrategicRow[] = [
  {
    competitor: "Lodha Amara",
    target_persona: "Value Seeker, First-time buyer, RTMI urgency",
    key_usp: "Ready possession, proven delivery, green lifestyle, volume trust",
    primary_weakness: "High density (40+ towers), crowding, amenity congestion, MLCP parking, LIG residents",
    what_they_say: "Eternia expensive and under construction, why wait and pay more?",
    counter_argument: "Low density = exclusivity. Olympic amenities. 20-acre park vs 2-acre. You pay ₹5L more for 5 years of peace.",
    win_rate: "60%",
  },
  {
    competitor: "Dosti Westcounty",
    target_persona: "Budget upgrader, Price-sensitive family",
    key_usp: "Best price in Thane, EuroSchool, township at affordable rate",
    primary_weakness: "Balkum location (vs Kolshet), quality concerns (leakage issues), brand perception",
    what_they_say: "Eternia overpriced, we offer same features for ₹30L less",
    counter_argument: "Brand legacy (55 years vs Dosti issues), Geberit fittings vs their brand, Kolshet > Balkum",
    win_rate: "50%",
  },
  {
    competitor: "Godrej Ascend",
    target_persona: "Risk-averse, Investor, Brand-conscious",
    key_usp: "Godrej trust, efficient layouts, sports amenities, strong corporate governance",
    primary_weakness: "Small carpet areas, UC risk (though lower than Eternia), investor-focused not end-use",
    what_they_say: "Better brand, similar features, why pay extra for Kalpataru?",
    counter_argument: "GCP (20 acres) > Sports Arena. Active lifestyle narrative. Eternia = end-use focus, Godrej = investor focus.",
    win_rate: "45%",
  },
  {
    competitor: "Piramal Vaikunth",
    target_persona: "Spiritual, HNI, Snob value seeker",
    key_usp: "ISKCON temple, biophilic luxury, premium finishes, high snob value",
    primary_weakness: "Some clusters compact despite premium pricing, Balkum location",
    what_they_say: "We are the gold standard, Eternia cannot match our prestige",
    counter_argument: "Active living (sports) > Passive spiritual. GCP larger. Kolshet > Balkum for metro connectivity.",
    win_rate: "55%",
  },
  {
    competitor: "Oberoi Forestville",
    target_persona: "HNI, Brand-conscious, 3BHK buyer",
    key_usp: "Oberoi brand (gold standard delivery), new launch, premium finishes",
    primary_weakness: "New launch = uncertain timeline, no sample flats yet",
    what_they_say: "Oberoi delivery > Kalpataru delivery, proven track record",
    counter_argument: "Immensa delays = past. Eternia separate timeline. Roots proves quality. GCP operational, Oberoi nothing yet.",
    win_rate: "40%",
  },
  {
    competitor: "Runwal Zenith",
    target_persona: "Family upgrader, 3BHK buyer",
    key_usp: "3BHK specialist, Jodi options, family-centric design",
    primary_weakness: "Runwal safety concerns (lift collapse 2024), Balkum location",
    what_they_say: "Better 3BHK value, more space per rupee",
    counter_argument: "Safety track record: Kalpataru 55 years zero incidents. Kolshet > Balkum. Quality > quantity.",
    win_rate: "65%",
  },
  {
    competitor: "Lodha Crown",
    target_persona: "Budget-capped, Entry-level, Investor (compact)",
    key_usp: "Lowest entry point in Kolshet, Lodha brand at budget",
    primary_weakness: "Very compact (322 sqft 1BHK = glorified studio)",
    what_they_say: "Lodha brand at affordable price",
    counter_argument: "Not comparable - different segments. Eternia = spacious living, Crown = investment/rental.",
    win_rate: "70%",
  },
  {
    competitor: "Rustomjee La Vie",
    target_persona: "Family upgrader, Premium seeker",
    key_usp: "Township in Uptown Urbania, Olympic pool, premium finishes",
    primary_weakness: "Majiwada location, higher PSF",
    what_they_say: "Premium township experience",
    counter_argument: "Kolshet metro connectivity superior. GCP 20 acres > their amenities. Better value per sqft.",
    win_rate: "55%",
  },
];

// ============= HELPER FUNCTION FOR INTEGRATION =============

/**
 * Run Stage 4 evaluation on Stage 3 + Stage 2.5 outputs
 * Returns corrected outputs with audit trail
 */
export async function evaluateOutputs(
  stage3Result: any,
  crossSellResult: any,
  extractedSignals: any,
  towerInventory: TowerInventoryRow[],
  competitorPricing: CompetitorPricingRow[],
  sisterProjects: SisterProjectRow[],
  projectMetadata: Record<string, any>,
  openRouterApiKey: string
): Promise<EvaluatorResponse | null> {
  try {
    // Build lead context from extracted signals
    const leadContext = {
      persona: stage3Result?.persona || extractedSignals?.core_motivation || "Unknown",
      objections_detected: stage3Result?.objection_categories_detected || [],
      budget_stated: extractedSignals?.financial_signals?.budget_stated_cr || null,
      timeline: extractedSignals?.engagement_signals?.finalization_timeline || null,
    };

    // Build knowledge base
    const knowledgeBase: EvaluatorKnowledgeBase = {
      talkingPoints: TALKING_POINTS,
      nbaRules: NBA_RULES,
      personaMatrix: PERSONA_OBJECTION_MATRIX,
      towerInventory,
      competitorPricing,
      competitorStrategic: COMPETITOR_STRATEGIC_DATA,
      sisterProjects,
      projectMetadata,
    };

    // Build evaluator prompt
    const evaluatorPrompt = buildEvaluatorPrompt(
      stage3Result,
      crossSellResult,
      extractedSignals,
      knowledgeBase,
      leadContext
    );

    // Run evaluator
    const evaluatedOutput = await runEvaluator(evaluatorPrompt, openRouterApiKey);

    return evaluatedOutput;
  } catch (error) {
    console.error("Stage 4 Evaluator failed:", error);
    return null;
  }
}
