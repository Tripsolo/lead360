
# Stage 3: NBA & Talking Points Generation Implementation Plan

## Overview

Implement a new **Stage 3 prompt** that separates NBA (Next Best Action) and Talking Points generation from Stage 2 (Lead Scoring). This stage will use a **decision tree framework** based on the provided Excel matrix to select specific NBA-IDs and TP-IDs, then contextualize them for each lead.

---

## Architecture Changes

### Current Pipeline (2 Stages)
```text
┌──────────────────────┐      ┌───────────────────────────────────┐
│ Stage 1              │ ───▶ │ Stage 2                           │
│ Signal Extraction    │      │ Scoring + Persona + Talking Points│
│ (CRM + MQL parsing)  │      │ + NBA (all in one)                │
└──────────────────────┘      └───────────────────────────────────┘
```

### New Pipeline (3 Stages)
```text
┌──────────────────────┐      ┌──────────────────────────┐      ┌───────────────────────────┐
│ Stage 1              │ ───▶ │ Stage 2                  │ ───▶ │ Stage 3                   │
│ Signal Extraction    │      │ Scoring + Persona        │      │ NBA + Talking Points      │
│ (CRM + MQL parsing)  │      │ + Concerns + Summary     │      │ (Decision Tree Framework) │
└──────────────────────┘      └──────────────────────────┘      └───────────────────────────┘
                                      │                                    │
                                      │ Outputs:                           │ Outputs:
                                      │ - pps_score                        │ - next_best_action
                                      │ - persona                          │ - nba_id
                                      │ - primary_concern_category         │ - nba_action_type
                                      │ - key_concerns                     │ - talking_points[]
                                      │ - extracted_signals                │   - tp_id
                                                                           │   - type
                                                                           │   - point (contextualized)
```

---

## Framework Data Structures

### 1. Talking Points Matrix (43 entries from Excel Sheet 1)

| Category | Objection/Scenario | TP-ID | Components |
|----------|-------------------|-------|------------|
| Economic Fit | Wants RTMI at UC price | TP-ECO-001 | Talking Point + Key Data + Emotional Hook + Logical Argument + Competitor Counter |
| Economic Fit | Getting cheaper at competition | TP-ECO-003 | Show lifestyle and gentry comparison |
| Possession Timeline | Staying on rent, EMI+rent burden | TP-POS-001 | Rent vs price saving + appreciation math |
| ... | ... | ... | ... |

**Total: 43 Talking Points across 8 categories**

### 2. NBA Rules Matrix (49 entries from Excel Sheet 2)

| NBA-ID | Trigger Condition | Action Category | Specific Action | Linked TPs |
|--------|-------------------|-----------------|-----------------|------------|
| NBA-COM-001 | Post Site Visit + 1-3 days since visit | COMMUNICATION | Call within 24-72 hours | - |
| NBA-COM-003 | Objection=Timeline + Senior Citizen (75+) | COMMUNICATION | IMMEDIATE pivot to RTMI | TP-SPEC-005 |
| NBA-COL-001 | Objection=Price + Competitor mentioned | CONTENT/COLLATERAL | Send competitor comparison PDF | TP-ECO-003, TP-COMP-003 |
| ... | ... | ... | ... | ... |

**5 Action Categories:** COMMUNICATION, CONTENT/COLLATERAL, OFFER, FOLLOW-UP, ESCALATION

### 3. Persona-Objection Matrix (Excel Sheet 4)

Maps 12 Personas x 8 Objection Categories to specific NBA-ID + TP-ID combinations:

| Persona | Economic Fit (Budget Gap <15%) | Possession Timeline (RTMI Urgent 75+) | Competition (Price Lower) |
|---------|-------------------------------|---------------------------------------|---------------------------|
| Lifestyle Connoisseur | NBA-OFF-001 + TP-ECO-003 | NBA-ESC-004 + TP-SPEC-005 | NBA-COL-001 + TP-COMP-003 |
| Aspirant Upgrader | NBA-OFF-001 + TP-ECO-007 | NBA-ESC-004 + TP-SPEC-005 | NBA-COL-001 + TP-COMP-003 |
| Settlement Seeker | REDIRECT TO RTMI | CRITICAL - NBA-ESC-004 | REDIRECT TO RTMI |
| ... | ... | ... | ... |

### 4. Objection Categories (8 from Excel Sheet 5)

| Category ID | Category Name | Detection Keywords |
|-------------|---------------|-------------------|
| OBJ-CAT-01 | Economic Fit | budget, expensive, price, afford, EMI, loan, cheaper |
| OBJ-CAT-02 | Possession Timeline | possession, delay, RTMI, move in, immediate, 75+, urgent |
| OBJ-CAT-03 | Inventory & Product | small, compact, room size, vastu, deck, view, facing |
| OBJ-CAT-04 | Location & Ecosystem | location, far, commute, metro, school, hospital |
| OBJ-CAT-05 | Competition | Lodha, Dosti, Runwal, competitor, Amara, cheaper there |
| OBJ-CAT-06 | Investment & Special | investment, ROI, rental, yield, appreciation |
| OBJ-CAT-07 | Decision Process | discuss, family, exploring, decision maker, bring |
| OBJ-CAT-08 | Special Scenarios | Amara resident, existing customer, NRI, first home |

---

## Implementation Steps

### Step 1: Create Framework Constants

Create a new utility file that embeds the decision tree matrix as constants:

**File: `supabase/functions/analyze-leads/nba-framework.ts`**

```text
// Framework Constants
export const TALKING_POINTS: Record<string, TalkingPointDef>
export const NBA_RULES: Record<string, NBARule>
export const PERSONA_OBJECTION_MATRIX: Record<PersonaId, Record<ObjectionCategory, MatrixEntry>>
export const OBJECTION_DETECTION_KEYWORDS: Record<ObjectionCategory, string[]>

// Helper Functions
export function detectObjectionCategories(signals: ExtractedSignals): ObjectionCategory[]
export function lookupMatrixEntry(persona: string, objection: ObjectionCategory): MatrixEntry
export function getTalkingPointDef(tpId: string): TalkingPointDef
export function getNBARuleDef(nbaId: string): NBARule
```

### Step 2: Update Stage 2 Output

Remove `talking_points` and `next_best_action` from Stage 2 output. Add new fields:

**Stage 2 Output Changes:**
```text
Remove:
- talking_points
- next_best_action

Keep:
- ai_rating, pps_score, pps_breakdown
- persona, persona_description
- key_concerns, concern_categories, primary_concern_category
- summary, rating_rationale
- extracted_signals
- mql_credit_rating, mql_data_available
- cross_sell_recommendation
```

### Step 3: Create Stage 3 Prompt Builder

**Function: `buildStage3Prompt()`**

Inputs:
- Stage 2 analysis output (persona, concerns, signals)
- Stage 1 extracted signals (for visit notes, competitor mentions)
- Talking Points matrix
- NBA rules matrix
- Persona-Objection matrix

Prompt Structure:
```text
# STAGE 3: NBA & TALKING POINTS GENERATION

## INPUT DATA (From Stage 1 & Stage 2)
- Detected Persona: {persona}
- Primary Concern Category: {primary_concern_category}
- Secondary Concerns: {concern_categories}
- Visit Notes Summary: {visit_notes_summary}
- Competitors Mentioned: {competitors_mentioned}
- Engagement Signals: {engagement_signals}
- MQL Data Available: {boolean}

## DECISION TREE FRAMEWORK

### Step 1: Objection Classification
Scan visit comments and CRM data for keywords matching these categories:
{OBJECTION_DETECTION_KEYWORDS}

Output: objection_categories[] ranked by frequency/emphasis

### Step 2: Persona-Objection Matrix Lookup
Use the detected persona + primary objection to find the recommended:
- NBA-ID and action type
- Linked TP-IDs

{PERSONA_OBJECTION_MATRIX excerpt for detected persona}

### Step 3: Talking Point Selection
For each selected TP-ID, retrieve the full definition:
{TALKING_POINTS relevant subset}

### Step 4: Contextualization
Transform the generic talking point text into a lead-specific version:
- Include specific numbers from extracted_signals (budget, carpet area, competitors)
- Reference customer's stated concerns from visit notes
- Keep emotional hook and logical argument structure
- Maximum 20 words per talking point

### Step 5: NBA Action Generation
From the selected NBA-ID, generate the specific action:
- Include lead-specific context (unit interested, timeline)
- Maximum 15 words
- Action type: {COMMUNICATION | CONTENT/COLLATERAL | OFFER | FOLLOW-UP | ESCALATION}

## MANDATORY SAFETY CHECKS

1. IF persona = "Settlement Seeker" AND beneficiary_age > 75:
   - OUTPUT: NBA-ESC-004 (Immediate resale pivot)
   - DO NOT recommend UC pitch
   - TP: TP-SPEC-005 only

2. IF persona = "Vastu-Rigid Buyer":
   - Only recommend vastu-compliant inventory
   - Never show non-compliant units

3. IF competitor mentioned but not visited yet:
   - Include competitor comparison talking point

## OUTPUT STRUCTURE
{
  "objection_categories_detected": ["Economic Fit", "Competition"],
  "primary_objection": "Economic Fit - Budget Gap",
  "secondary_objections": ["Competition - Price Lower"],
  
  "next_best_action": {
    "nba_id": "NBA-OFF-001",
    "action_type": "OFFER",
    "action": "Suggest lower floor (same layout) to bridge ₹15L gap",
    "escalation_trigger": "No suitable alternative found",
    "fallback_action": "Discuss structured payment plan"
  },
  
  "talking_points": [
    {
      "tp_id": "TP-ECO-007",
      "type": "Objection handling",
      "point": "2-floor lower unit saves ₹6L, covers your budget gap. Same GCP view.",
      "source_text": "A 2-floor lower unit saves ₹4-6L which covers the CLP deviation"
    },
    {
      "tp_id": "TP-COMP-003",
      "type": "Competitor handling", 
      "point": "Runwal offers 918sqft at ₹2.7Cr. Eternia: 1100sqft at competitive pricing.",
      "source_text": "Highlight layout efficiency, quality difference, total cost of ownership"
    }
  ],
  
  "safety_check_triggered": null | "75+ RTMI mandatory" | "Vastu filter applied"
}
```

### Step 4: Update Edge Function Pipeline

**File: `supabase/functions/analyze-leads/index.ts`**

Changes:
1. Import framework constants from `nba-framework.ts`
2. Modify Stage 2 output structure (remove talking_points, NBA)
3. Add Stage 3 LLM call after Stage 2
4. Merge Stage 2 and Stage 3 outputs before storing
5. Add safety check validation in code (not just prompt)

```text
// After Stage 2 completes
const stage3Prompt = buildStage3Prompt(
  stage2Result,
  extractedSignals,
  TALKING_POINTS,
  NBA_RULES,
  PERSONA_OBJECTION_MATRIX
);

const stage3Response = await callGeminiAPI(stage3Prompt, googleApiKey, true);
const nbaResult = JSON.parse(stage3Response);

// Code-level safety validation
if (nbaResult.safety_check_triggered === null) {
  // Validate mandatory rules
  if (isSettlementSeeker75Plus(extractedSignals, stage2Result)) {
    nbaResult.next_best_action.nba_id = "NBA-ESC-004";
    nbaResult.next_best_action.action_type = "ESCALATION";
    nbaResult.next_best_action.action = "Immediate transfer to Resale Desk - RTMI only";
    nbaResult.safety_check_triggered = "75+ RTMI mandatory";
  }
}

// Merge into final result
const finalResult = {
  ...stage2Result,
  ...nbaResult
};
```

### Step 5: Update TypeScript Types

**File: `src/types/lead.ts`**

Add new fields to `AnalysisResult['fullAnalysis']`:

```typescript
// Enhanced talking points with TP-ID
talking_points?: Array<{
  tp_id: string;  // e.g., "TP-ECO-007"
  type: 'What to highlight' | 'Competitor handling' | 'Objection handling';
  point: string;  // Contextualized version
  source_text?: string;  // Original framework text
}>;

// Enhanced NBA with ID and action type
next_best_action?: {
  nba_id: string;  // e.g., "NBA-OFF-001"
  action_type: 'COMMUNICATION' | 'CONTENT/COLLATERAL' | 'OFFER' | 'FOLLOW-UP' | 'ESCALATION';
  action: string;  // Specific action text
  escalation_trigger?: string;
  fallback_action?: string;
};

// Objection classification
objection_categories_detected?: string[];
primary_objection?: string;
secondary_objections?: string[];

// Safety tracking
safety_check_triggered?: string | null;
```

### Step 6: Update Frontend Components

**Files:**
- `src/components/LeadReportModal.tsx`
- `src/components/LeadCard.tsx`

Changes:
1. Display NBA action type as a badge
2. Show TP-IDs for reference
3. Display safety warnings prominently
4. Handle backward compatibility for old analyses

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/analyze-leads/nba-framework.ts` | **Create** | Framework constants (TPs, NBAs, Matrix) |
| `supabase/functions/analyze-leads/index.ts` | **Modify** | Add Stage 3, update pipeline |
| `src/types/lead.ts` | **Modify** | Add new type definitions |
| `src/components/LeadReportModal.tsx` | **Modify** | Display enhanced NBA/TPs |
| `src/components/LeadCard.tsx` | **Modify** | Display action type badge |

---

## Framework Embedding Strategy

The 43 Talking Points and 49 NBA Rules will be embedded in the Stage 3 prompt as a condensed lookup table. Only the relevant subset (based on detected persona and objection) will be passed to the LLM to avoid context overload.

**Prompt Token Optimization:**
- Full framework: ~4000 tokens (too large)
- Filtered subset per lead: ~800-1200 tokens (efficient)

---

## Fallback Behavior

For scenarios not covered by the matrix (e.g., edge cases):
1. Existing Stage 2 talking points logic serves as fallback
2. If Stage 3 fails, use generic talking points from Stage 2-style generation
3. Log uncovered scenarios for framework expansion

---

## Testing Plan

1. **Unit Tests**: Validate objection detection keyword matching
2. **Matrix Coverage**: Test all 12 personas x 8 objection combinations
3. **Safety Rules**: Verify 75+ RTMI and Vastu-Rigid rules always trigger
4. **E2E Test**: Upload test leads, verify correct TP-IDs and NBA-IDs selected
5. **Backward Compatibility**: Old analyses without new fields still display correctly

---

## Summary

This implementation:

1. **Separates concerns**: Lead scoring (Stage 2) vs action generation (Stage 3)
2. **Uses decision tree framework**: Persona × Objection matrix lookup
3. **Contextualizes framework content**: TP-IDs → lead-specific talking points
4. **Tracks IDs for audit**: Both TP-ID and NBA-ID stored for reference
5. **Enforces safety rules**: Code + prompt validation for critical scenarios
6. **Maintains backward compatibility**: Existing guidelines as fallback
