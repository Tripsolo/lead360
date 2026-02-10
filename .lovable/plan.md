
# Plan: Scenario-Driven NBA/TP Generator (Stage 3 A/B Variant)

## Overview

Add a parallel Stage 3 variant ("scenario-driven") that runs alongside the existing "matrix-driven" Stage 3 as an A/B test. The scenario variant uses a cleaned objection playbook (39 real-world sales scenarios) as LLM grounding instead of deterministic TP-ID lookup, allowing the model to reason creatively within strategic guardrails.

Both variants produce the same output schema (`talking_points[]`, `next_best_action{}`) and are stored with a `stage3_variant` field for comparison.

## What Stays the Same

- Stages 1, 2, 2.5: Completely unchanged
- Stage 4 Evaluator: Minor tweak only (skip TP-ID existence check for scenario variant)
- Output schema: Identical -- both variants produce the same JSON shape
- Safety overrides: Reused from existing `checkSafetyConditions()` in `nba-framework.ts`

## Changes

### 1. New File: `supabase/functions/analyze-leads/nba-scenario-framework.ts`

Contains:
- **`OBJECTION_PLAYBOOK`** constant: The cleaned 39-scenario playbook as a markdown string (7 categories: Economic Fit, Possession Timeline, Inventory and Product, Location and Ecosystem, Competition, Investment, Decision Process), embedded directly in the file
- **`buildStage3ScenarioPrompt()`** function: Builds the scenario-driven prompt using:
  - Stage 2 result (persona, concerns, rating, PPS score)
  - Extracted signals (budget, timeline, competitors, demographics)
  - Visit comments (raw CRM notes)
  - Tower inventory and competitor pricing (live KB data, formatted as markdown tables)
  - Project metadata
  - Safety check results (reuses `checkSafetyConditions()` from existing `nba-framework.ts`)

The prompt instructs the LLM to:
1. Read the playbook scenarios and identify the 2-3 most relevant ones
2. Use live KB data (tower inventory, competitor pricing) for all numerical claims
3. Generate 3-5 talking points with types (Highlight, Objection handling, Competitor handling)
4. Generate a strategic NBA with action type, specific action, escalation trigger, and fallback
5. Output the same JSON schema as the matrix variant

Key differences from matrix variant prompt:
- No TP-IDs or NBA-IDs (uses scenario references like `"[ECO-3]"` instead)
- No pre-selection block -- the LLM reasons from the playbook
- Playbook scenarios provide strategic direction; KB data provides factual grounding
- Explicit instructions to never fabricate prices/dates not in KB

### 2. Modified File: `supabase/functions/analyze-leads/index.ts`

**Import addition (top of file):**
- Import `buildStage3ScenarioPrompt` from `./nba-scenario-framework.ts`

**A/B variant selection (before Stage 3 block, ~line 2990):**
- Add a `stage3Variant` variable: `"matrix" | "scenario"`
- Selection logic: Use lead index modulo 2 -- even-indexed leads get `"matrix"`, odd-indexed get `"scenario"`
- This gives a clean 50/50 split within each batch for comparison

**Stage 3 routing (within the Stage 3 block):**
- When `stage3Variant === "scenario"`:
  - Skip the pre-selection block (no deterministic lookup needed)
  - Call `buildStage3ScenarioPrompt()` instead of `buildStage3Prompt()`
  - Same model (Claude Sonnet 4.5 via OpenRouter), same JSON cleanup, same safety override post-processing
  - Same fallback to Gemini 2.5 Flash on failure
- When `stage3Variant === "matrix"`:
  - Existing flow unchanged (pre-selection + `buildStage3Prompt()`)

**Variant metadata storage (after Stage 3 completes):**
- Add `stage3_variant: stage3Variant` to `analysisResult` before Stage 4
- Update `models_used` to include `stage3_variant` field

### 3. Modified File: `supabase/functions/analyze-leads/evaluator.ts`

**Minor change in Rule 1 (TP-ID Validity) and Rule 9 (NBA-ID Validity):**
- The evaluator prompt receives the stage3 output which may now lack valid TP-IDs/NBA-IDs (scenario variant uses descriptive references like `"[ECO-3]"`)
- Add a conditional: if the talking points don't have standard TP-ID format (matching `/^TP-[A-Z]{2,4}-\d{3}$/`), skip Rule 1 and Rule 9 validation
- All other rules (factual accuracy, competitor data, cross-sell, safety, PPS exclusion, budget standardization) still apply

**Implementation approach:**
- Pass `stage3Variant` as a parameter to `evaluateOutputs()`
- In the prompt builder, conditionally include/exclude Rule 1 and Rule 9 text based on variant

## Technical Notes

- The `nba-scenario-framework.ts` file will be ~400-450 lines (mostly the playbook constant)
- The playbook is embedded as a string constant to avoid file I/O in the edge function
- Safety conditions are handled identically: `checkSafetyConditions()` runs before both variants, and post-Stage-3 safety override code is shared
- The A/B split is deterministic (based on lead index), ensuring reproducibility within a batch
- No database schema changes needed -- `stage3_variant` is stored inside the existing `full_analysis` JSONB column
