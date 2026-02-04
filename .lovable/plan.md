
# Stage 4: Output Evaluator Implementation

## Overview

This implementation adds a **Stage 4: Output Evaluator** that uses Claude Sonnet 4.5 via OpenRouter to validate and auto-correct TP, NBA, and Cross-Sell outputs against the internal knowledge base.

Key improvements based on your feedback:
1. **Master Knowledge Base as Source of Truth**: The parsed Excel data (project metadata, tower inventory, competitor pricing/features) will be passed as separate metadata to the evaluator
2. **Competitor-Specific Objection Handling**: The evaluator will specifically validate and enhance competitor-related talking points with accurate pricing, inventory, and strategic counter-arguments from the knowledge base

---

## Architecture

```text
ANALYSIS PIPELINE
-----------------
Stage 1: Signal Extraction (Gemini 3 Flash)
    |
Stage 2: Scoring & Persona (Claude Opus 4.5)
    |
Stage 2.5: Cross-Sell Recommendation (Gemini 3 Flash)
    |
Stage 3: NBA & Talking Points (Gemini 3 Flash)
    |
Stage 4: OUTPUT EVALUATOR (Claude Sonnet 4.5 via OpenRouter)
    - Validates TP/NBA/CSO against framework rules
    - Cross-checks with tower inventory for accurate pricing
    - Validates competitor-specific objection handling
    - Corrects talking points with accurate competitor data
    - Returns refined final output with audit trail
```

---

## Key Knowledge Base Data to Pass

Based on the Master Knowledge Base Excel, the evaluator will receive:

### 1. Tower Inventory (Source of Truth for Pricing)

| Project | Tower | Typology | Carpet (sqft) | Closing Min (Cr) | Closing Max (Cr) | OC Date | Construction % |
|---------|-------|----------|---------------|------------------|------------------|---------|----------------|
| Eternia | A | 2 BHK | 600-699 | 1.38 | 1.77 | Oct 2029 | 3% |
| Eternia | B | 2 BHK | 600-699 | 1.33 | 1.68 | Jul 2027 | 22% |
| Eternia | D | 1 BHK | <500 | 1.02 | 1.19 | Apr 2026 | 85% |
| Primera | A | 2 BHK | 400-499 | 0.91 | 1.03 | Feb 2029 | 56% |
| Estella | A | 2 BHK | 700-799 | 1.49 | 1.74 | Jan 2031 | 20% |
| Immensa | G | 4 BHK | 1700-1799 | 4.51 | 4.86 | Mar 2026 | 95% (OC Received) |

### 2. Competitor Pricing Data (For Objection Validation)

| Competitor | Config | Carpet (sqft) | Price Min (L) | Price Max (L) | PSF | vs Eternia |
|------------|--------|---------------|---------------|---------------|-----|------------|
| Lodha Amara | 2BHK | 598-618 | 110L | 115L | 18,000 | Cheaper 12% |
| Lodha Amara | 3BHK | 865-948 | 160L | 170L | 17,500 | Similar |
| Godrej Ascend | 2BHK | 571-620 | 95L | 124L | 18,000-19,000 | Similar |
| Godrej Ascend | 3BHK | 755-897 | 127L | 226L | 20,000-22,400 | More expensive |
| Dosti Westcounty | 2BHK | 552-757 | 110L | 157L | 18,000 | Cheaper 10% |
| Oberoi Forestville | 3BHK | 1045-1052 | 188L | 250L | 19,000 | Similar pricing |
| Piramal Vaikunth | 2BHK | 495-811 | 111L | 189L | 22,000 | Premium |

### 3. Competitor Strategic Counter-Arguments

| Competitor | Primary Weakness | Counter-Argument | Win Rate |
|------------|-----------------|------------------|----------|
| Lodha Amara | High density (40+ towers), MLCP parking | Low density = exclusivity. 20-acre park vs 2-acre | 60% |
| Dosti Westcounty | Balkum location, quality concerns, leakage issues | Brand legacy (55 years), Geberit fittings, Kolshet > Balkum | 50% |
| Godrej Ascend | Small carpet areas, UC risk | GCP (20 acres) > Sports Arena, end-use focus | 45% |
| Piramal Vaikunth | Some clusters compact, Balkum location | Active living > Passive spiritual, Kolshet metro connectivity | 55% |
| Oberoi Forestville | New entrant, less track record | Kalpataru 55 years delivery, township maturity | 50% |

---

## Evaluator Validation Rules

### Rule Category 1: TP Selection Validity
- Every `tp_id` MUST exist in the TALKING_POINTS definitions
- The TP-ID MUST be linked to the selected NBA-ID in `NBA_RULES.linked_talking_points`
- If not linked, verify it appears in `PERSONA_OBJECTION_MATRIX` for the detected persona + objection

### Rule Category 2: TP Content Accuracy
- Numeric data (prices, areas, dates) MUST come from `tower_inventory` or `project_metadata`
- NEVER fabricate specific prices or dates not in the knowledge base
- Cross-sell prices must use `closing_min_cr` / `closing_max_cr` from inventory

### Rule Category 3: Competitor Objection Validation (NEW)
When a talking point references a competitor:
1. Validate pricing against `competitor_pricing` table
2. Ensure counter-arguments align with documented weaknesses
3. Include specific PSF comparisons where relevant
4. Correct any inaccurate competitor claims

**Example corrections:**
- If TP says "Lodha Amara 2BHK at ₹1.3Cr" but data shows ₹1.1-1.15Cr → CORRECT
- If TP says "Godrej has similar pricing" but data shows 10% higher PSF → CORRECT with specifics
- If competitor counter-argument is generic → ENHANCE with specific weakness from knowledge base

### Rule Category 4: Cross-Sell Budget Validation
Using `tower_inventory` data:
- Find the `recommended_project` + `recommended_config` combination
- Get the actual `closing_min_cr` from inventory
- IF `closing_min_cr > (lead_budget × 1.20)` THEN REJECT
- CORRECT: Either null the recommendation OR suggest valid alternative

### Rule Category 5: Cross-Sell Possession Validation
Using `tower_inventory.oc_date`:
- Calculate months between `oc_date` and lead's stated expectation
- IF difference > 8 months THEN FLAG
- Exception: If lead has no stated urgency, this rule passes

### Rule Category 6: Safety Rule Override
IF the original output ignored a safety condition:
- 75+ with RTMI need → MUST use NBA-ESC-004, redirect to resale
- Proxy buyer → MUST use NBA-COM-010, push for decision-maker visit
- CORRECT the NBA if safety rule was violated

### Rule Category 7: Investor Persona TP Mismatch
IF persona = "Pragmatic Investor" or "First-Time Investor":
- talking_points MUST include at least one TP-INV-* (Investment category)
- MUST NOT include family-centric arguments (school, kids, lifestyle)
- CORRECT: Replace with TP-INV-006 or appropriate investment TP

---

## File Changes

| File | Action |
|------|--------|
| `supabase/functions/analyze-leads/evaluator.ts` | **NEW** - Evaluator prompt builder, knowledge base injection, OpenRouter integration |
| `supabase/functions/analyze-leads/index.ts` | Add Stage 4 call after Stage 3, pass knowledge base metadata |
| `supabase/functions/analyze-leads/nba-framework.ts` | Export additional constants for evaluator use |

---

## New File: evaluator.ts

### Key Functions

```typescript
// Build the evaluator prompt with full knowledge base context
export function buildEvaluatorPrompt(
  stage3Output: any,
  crossSellOutput: any,
  extractedSignals: any,
  knowledgeBase: {
    // Framework definitions (static)
    talkingPoints: Record<string, TalkingPointDef>,
    nbaRules: Record<string, NBARule>,
    personaMatrix: Record<string, Record<string, MatrixEntry>>,
    
    // Project data (from Master Knowledge Base)
    towerInventory: TowerInventoryRow[],
    competitorPricing: CompetitorPricingRow[],
    competitorStrategic: CompetitorStrategicRow[],
    projectMetadata: ProjectMetadata,
    sisterProjects: SisterProject[]
  }
): string

// Execute the evaluator via OpenRouter
export async function runEvaluator(
  prompt: string,
  openRouterApiKey: string
): Promise<EvaluatorResponse>
```

### Competitor-Specific Validation Logic

The evaluator will specifically check competitor-related outputs:

```typescript
// When a TP references a competitor, validate:
function validateCompetitorReference(
  talkingPoint: any,
  competitorData: CompetitorPricingRow[],
  strategicData: CompetitorStrategicRow[]
): ValidationResult {
  // Extract competitor name from TP
  const competitorMentioned = extractCompetitorName(talkingPoint.point);
  
  if (competitorMentioned) {
    // Get actual pricing from knowledge base
    const actualPricing = competitorData.filter(c => 
      c.competitor.toLowerCase().includes(competitorMentioned.toLowerCase())
    );
    
    // Get strategic counter-arguments
    const strategic = strategicData.find(c => 
      c.competitor.toLowerCase().includes(competitorMentioned.toLowerCase())
    );
    
    // Validate pricing claims
    // Validate counter-argument alignment
    // Return corrections if needed
  }
}
```

---

## Evaluator Prompt Structure

```text
# OUTPUT EVALUATOR - TP, NBA & CROSS-SELL VALIDATION

You are a quality assurance specialist for real estate sales AI. 
Your task is to validate and correct generated outputs against 
the internal knowledge base.

## YOUR ROLE
1. VALIDATE: Check if outputs comply with framework rules and knowledge base
2. IDENTIFY: Flag any mismatches, factual errors, or competitor misinformation
3. CORRECT: Modify incorrect outputs to align with the knowledge base
4. ENHANCE: Strengthen competitor counter-arguments with specific data
5. EXPLAIN: Provide reasoning for each correction

## KNOWLEDGE BASE (SOURCE OF TRUTH)

### TOWER INVENTORY
[Injected tower_inventory data with closing prices, OC dates, unsold units]

### COMPETITOR PRICING
[Injected competitor_pricing with config-wise pricing, PSF, vs Eternia comparison]

### COMPETITOR STRATEGIC POSITIONING
[Injected competitor weaknesses, counter-arguments, win rates]

### PROJECT METADATA
[Injected Eternia, Primera, Estella, Immensa metadata]

## VALIDATION RULES

[Full rule set as documented above]

## COMPETITOR OBJECTION ENHANCEMENT RULES

When validating competitor-related talking points:

1. If TP mentions Lodha Amara pricing, verify against:
   - 2BHK: ₹92L-135L (600-830 sqft carpet)
   - 3BHK: ₹160L-200L (865-1077 sqft carpet)
   - PSF: ₹16,500-18,000
   
2. If TP makes density comparison, ensure accuracy:
   - Lodha Amara: 4864 units across 40+ towers = 121 families/acre
   - Eternia: 2166 units across 10 towers (within 108-acre township)
   
3. If TP references competitor weaknesses, align with documented list:
   - Lodha Amara → MLCP parking, density, LIG residents
   - Dosti → Balkum location, leakage issues, brand perception
   - Godrej → Small carpet areas, investor-focused not end-use
   - Piramal → Compact clusters, Balkum location, passive lifestyle
   
4. ENHANCE generic competitor counters with specifics:
   - "Competitor is crowded" → "Lodha Amara: 35+ towers, pool always crowded"
   - "We have better value" → "Our ₹23K PSF vs Godrej ₹20K but with 20-acre GCP access"

## INPUT FORMAT
{
  "stage3_output": { ... },
  "cross_sell_output": { ... },
  "extracted_signals": { ... },
  "lead_context": { persona, objections_detected, budget_stated, timeline }
}

## OUTPUT FORMAT
{
  "validation_summary": {
    "tp_validation": { "passed": boolean, "issues": [...] },
    "nba_validation": { "passed": boolean, "issues": [...] },
    "cross_sell_validation": { "passed": boolean, "issues": [...] },
    "competitor_validation": { "passed": boolean, "issues": [...] }
  },
  "corrections_made": [
    {
      "field": "talking_points[0].point",
      "original": "Lodha Amara 2BHK costs ₹1.3Cr",
      "corrected": "Lodha Amara 2BHK costs ₹1.1-1.15Cr (₹18K PSF) vs our ₹1.33-1.68Cr but includes 20-acre GCP access",
      "reason": "Price corrected per competitor_pricing. Added value differentiator"
    },
    {
      "field": "talking_points[1].competitor_counter",
      "original": "They have density issues",
      "corrected": "Lodha Amara: 4864 units in 40+ towers = MLCP parking, pool queues. Eternia: 2166 units in 10 towers with Olympic pool at 3x better ratio",
      "reason": "Enhanced with specific metrics from competitor_strategic data"
    }
  ],
  "final_output": {
    "next_best_action": { ... },
    "talking_points": [ ... ],
    "cross_sell_recommendation": { ... } | null
  }
}
```

---

## Integration in index.ts

After Stage 3 completes (around line 2800):

```typescript
// Stage 4: Output Evaluator
if (stage3Result && !stage3Result.error) {
  const evaluatorPrompt = buildEvaluatorPrompt(
    stage3Result,
    crossSellResult,
    extractedSignals,
    {
      talkingPoints: TALKING_POINTS,
      nbaRules: NBA_RULES,
      personaMatrix: PERSONA_OBJECTION_MATRIX,
      towerInventory,        // From DB query
      competitorPricing,     // From DB query
      competitorStrategic,   // From project metadata
      projectMetadata,
      sisterProjects
    }
  );
  
  const evaluatedOutput = await runEvaluator(
    evaluatorPrompt,
    Deno.env.get("OPENROUTER_API_KEY")
  );
  
  // Merge validated output with audit trail
  stage3Result = {
    ...evaluatedOutput.final_output,
    validation_summary: evaluatedOutput.validation_summary,
    corrections_made: evaluatedOutput.corrections_made,
    models_used: {
      ...stage3Result.models_used,
      stage4_evaluator: "anthropic/claude-sonnet-4"
    }
  };
}
```

---

## Database Queries for Knowledge Base

Add queries in `serve()` to fetch evaluator knowledge base:

```typescript
// Fetch tower inventory (already added in Phase 3)
const { data: towerInventory } = await supabase
  .from("tower_inventory")
  .select("*");

// Fetch competitor pricing
const { data: competitorPricing } = await supabase
  .from("competitor_pricing")
  .select("*");

// Competitor strategic data comes from project_metadata.competitor_positioning
```

---

## Token Optimization

The evaluator prompt will be optimized to stay within token limits:

1. **Selective Knowledge Base**: Only include:
   - TPs/NBAs relevant to the detected persona and objection categories
   - Tower inventory for current project + sister projects being considered
   - Competitor pricing for competitors mentioned in lead CRM data

2. **Compressed Formats**: Use tabular format for inventory/pricing data

3. **Estimated Usage**: ~6000-8000 tokens per evaluation

---

## Summary of Implementation

| Component | Description |
|-----------|-------------|
| `evaluator.ts` (NEW) | Prompt builder with knowledge base injection, OpenRouter API call, response parser |
| `index.ts` (MODIFY) | Add Stage 4 call after Stage 3, pass all knowledge base metadata |
| `nba-framework.ts` (MODIFY) | Export additional types for evaluator consumption |
| Database queries | Ensure tower_inventory and competitor_pricing are fetched |

## Expected Outcomes

1. **Accurate Pricing**: All TPs will have correct prices from actual tower inventory
2. **Competitor Accuracy**: Counter-arguments will use real PSF, density, and weakness data
3. **Cross-Sell Validity**: Recommendations strictly pass budget/possession/config guardrails
4. **Audit Trail**: `corrections_made` array provides transparency on what was fixed
5. **Enhanced Competitor Handling**: Generic objection responses become specific and data-backed
