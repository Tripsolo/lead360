

# Plan: Split Stage 3 into Two Sub-Prompts (3A Classification + 3B Generation)

## Rationale

Currently, Stage 3 asks the LLM to simultaneously:
1. Diagnose the customer's objections, concerns, and buying goal
2. Generate persuasive, data-backed talking points and a concrete NBA

These are fundamentally different cognitive tasks. Splitting them improves accuracy (classification is done without generation pressure), reduces hallucination (generation receives clean structured input), and enables better debugging (you can inspect 3A output independently).

## Architecture

```text
Stage 2 output + Stage 1 signals
        |
        v
  [Stage 3A: Classification]
  - Identifies primary/secondary objections
  - Determines customer buying goal
  - Determine key preferences like floors, views, amenities, vasstu etc.
  - Matches playbook scenarios (scenario variant) or matrix rows (matrix variant)
  - Assesses competitor threat level
  - Lightweight prompt: NO KB tables, NO TP/NBA definitions
        |
        v
  3A structured output (JSON)
        |
        v
  [Stage 3B: Generation]
  - Receives 3A classification as structured input
  - Has full KB data (tower_inventory, competitor_pricing)
  - Has TP/NBA framework definitions (matrix) or Playbook guidance (scenario)
  - Generates 2-3 contextualized talking points with real KB numbers
  - Generates specific NBA action
```

## Stage 3A Output Schema (Shared by Both Variants)

```json
{
  "primary_objection_category": "Economic Fit",
  "primary_objection_detail": "Budget gap - wants UC at lower price point",
  "secondary_objections": ["Competition", "Possession Timeline"],
  "customer_buying_goal": "Upgrade from 1BHK rental to owned 2BHK within 1.8 Cr budget",
  "amenities_preferences":["Looking for a Vaastu compliant house","Want greenery view","Looking for walking areas for parents"],
  "scenario_matched": ["Wants RTMI at UC price", "Getting cheaper at competition"],
  "competitor_threat": {
    "level": "high",
    "competitors": ["Lodha Amara"],
    "stated_advantage": "Lower price per sqft"
  },
  "key_preferences_distilled": {
    "config": "2BHK",
    "carpet_desired": "650+ sqft",
    "budget_cr": 1.8,
    "stage_preference": "UC acceptable",
    "possession_urgency": "moderate"
  },
  "decision_blockers": ["Needs spouse approval", "Comparing 2 more projects"]
}
```

## Stage 3B Input

Stage 3B receives:
- The full 3A output above (as a structured "# CLASSIFICATION RESULT" section)
- Lead profile context (persona, rating, capability, family stage, age -- same as today)
- Full KB tables (tower_inventory, competitor_pricing, project metadata)
- Safety check results
- For **matrix variant**: Pre-selected NBA/TP IDs from deterministic lookup (using 3A's primary_objection_category instead of raw objection detection)
- For **scenario variant**: The OBJECTION_PLAYBOOK guidance sections relevant to matched scenarios only (not the full 39-scenario playbook)

## Changes by File

### 1. `nba-framework.ts` (Matrix Variant)

- Add new function `buildStage3AClassificationPrompt(stage2Result, extractedSignals, visitComments)`:
  - Takes persona, concerns, visit notes, and demographic/financial signals
  - Asks LLM to classify objections and identify buying goal
  - No KB data, no TP/NBA definitions included
  - Returns the 3A schema above

- Rename current `buildStage3Prompt()` to `buildStage3BGenerationPrompt()`:
  - Add a new parameter `classificationResult` (3A output)
  - Replace the inline "Step 1: Objection Classification" section with the structured 3A output
  - Use `classificationResult.primary_objection_category` for matrix lookup instead of re-detecting from raw signals
  - Keep all KB, TP definitions, NBA rules, and generation instructions as-is

### 2. `nba-scenario-framework.ts` (Scenario Variant)

- Add new function `buildStage3AScenarioClassificationPrompt(stage2Result, extractedSignals, visitComments)`:
  - Same classification task, but asks the LLM to also match 1-2 playbook scenarios by name
  - Includes only the scenario NAMES/DESCRIPTIONS from the playbook (not the full GUIDANCE), so the LLM can identify which scenarios match
  - Produces the same 3A schema with `scenario_matched` populated

- Rename current `buildStage3ScenarioPrompt()` to `buildStage3BScenarioGenerationPrompt()`:
  - Add `classificationResult` parameter
  - Instead of including the full 39-scenario OBJECTION_PLAYBOOK, include ONLY the guidance for matched scenarios (filtered by `classificationResult.scenario_matched`)
  - This significantly reduces prompt size while maintaining strategic grounding

### 3. `index.ts` (Pipeline Orchestration)

- In the Stage 3 execution block (lines ~3067-3260):
  - Add Stage 3A call BEFORE Stage 3B for both variants
  - Stage 3A continues using Claude Sonnet 4.5 (primary) / Gemini 3 Pro Preview (fallback)
  - Stage 3B continues using Claude Sonnet 4.5 (primary) / Gemini 3 Pro Preview (fallback)
  - If 3A fails, fall back to the current single-prompt approach (backward compatibility)
  - For matrix variant: use 3A's `primary_objection_category` to drive the deterministic pre-selection (replacing the current `detectObjectionCategories` + `mapToMatrixObjection` logic, which can move into 3A)
  - Add diagnostic logging for 3A output

## What Does NOT Change

- Stage 1, Stage 2, Stage 2.5, Stage 4 -- untouched
- The TP/NBA framework definitions (TALKING_POINTS, NBA_RULES, PERSONA_OBJECTION_MATRIX) -- untouched
- The OBJECTION_PLAYBOOK content -- untouched (just selectively included in 3B)
- Safety check logic (`checkSafetyConditions`) -- still applied as code-level override after 3B
- Output schema consumed by the UI -- identical final output
- Database schema -- no changes


## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| 3A misclassifies objection | 3B still has visit notes summary and lead context to self-correct; also, evaluation at Stage 4 catches bad outputs |
| Extra latency |
| 3A API failure | Fall back to current single-prompt approach (no regression) |
| Information loss at handoff | 3A schema is comprehensive; visit_notes_summary is still passed to 3B |

