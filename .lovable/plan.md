

# Plan: Add Factual Guardrail Rules to Stage 3B and Cross-Sell Generation Prompts

## Overview

Add inline validation instructions (mirroring Evaluator Rules 12-15) directly into the three generation prompts so the LLM avoids errors at generation time, rather than relying solely on post-hoc correction by the evaluator.

## Changes

### 1. Matrix Variant Stage 3B (`nba-framework.ts` -- `buildStage3Prompt`)

Insert a new `## FACTUAL GUARDRAILS` section into the `instructionsSection` string (after the existing CRITICAL RULES block, around line 2471-2477). Add:

```
## FACTUAL GUARDRAILS (MUST FOLLOW)

8. **Possession Date Accuracy**: Any possession date or OC date you mention MUST match tower_inventory oc_date from the Knowledge Base. Never estimate or round dates. If no specific tower is named, use the range of OC dates for that project.

9. **Typology Existence Check**: Before referencing any project + config combination (e.g., "Immensa 2BHK", "Primera 3BHK"), verify it exists in the Knowledge Base inventory tables above. If a typology does not appear in the KB for that project, do NOT mention it.

10. **Pricing Accuracy**: Any PSF or price range you cite for Eternia or sister projects must be derived from tower_inventory closing_min_cr/closing_max_cr and carpet_sqft fields. Never use approximate or memorized pricing. If no inventory data exists, omit the price claim.

11. **No Generic Follow-Up for Leads with Objections**: If the lead has specific objections detected, do NOT generate a generic follow-up NBA (e.g., "schedule follow-up", "periodic check-in"). Instead, generate an action directly addressing the primary objection.
```

### 2. Scenario Variant Stage 3B (`nba-scenario-framework.ts` -- `buildStage3ScenarioPrompt`)

Insert the same `## FACTUAL GUARDRAILS` section into the `# GENERATION RULES` block (after rule 5, around line 667). Add:

```
## FACTUAL GUARDRAILS (MUST FOLLOW)

6. **Possession Date Accuracy**: Any possession/OC date mentioned MUST match tower_inventory oc_date from KB. Never estimate or round. Use the range of OC dates if no specific tower is named.

7. **Typology Existence Check**: Before referencing a project + config (e.g., "Immensa 2BHK"), verify it exists in KB inventory tables. If it does not exist, do NOT reference it.

8. **Pricing Accuracy**: Any PSF or price range for Eternia or sister projects must come from tower_inventory closing prices and carpet_sqft. Never use approximate pricing. Omit if data unavailable.

9. **No Generic Follow-Up for Leads with Objections**: If the lead has detected objections, do NOT generate a generic "schedule follow-up" or "periodic check-in" NBA. Generate an action addressing the primary objection.
```

### 3. Cross-Sell Prompt (`index.ts` -- `buildCrossSellPrompt`)

Insert a `## FACTUAL ACCURACY RULES` section after the existing Rule 5 (Match Priority) and before the `## EVALUATION PROCESS` section (around line 1196). Add:

```
### RULE 6: POSSESSION DATE ACCURACY
- The possession_date in the output MUST match the oc_date from the sister project's tower inventory data provided above.
- Never round, estimate, or use RERA dates. Use the exact oc_date value.

### RULE 7: TYPOLOGY EXISTENCE
- Only recommend a config (recommended_config) that actually exists in the sister project's configurations array above.
- If the desired config does not exist for a sister project, that project cannot be recommended for that config.

### RULE 8: PRICING FROM KB ONLY
- The price_range_cr in the output MUST use closing_price_min_cr and closing_price_max_cr from the configurations data above.
- Never cite PSF or price ranges from memory. If closing price data is missing, the project cannot be evaluated.
```

Also update the `## EVALUATION PROCESS` step count to reference the new rules (step 1: check ALL 7 rules).

## What Does NOT Change

- Evaluator Rules 12-15 remain as the safety net (post-hoc validation)
- Stage 3A classification prompts unchanged
- Stage 1 and Stage 2 prompts unchanged
- Database schema and UI unchanged
- No new dependencies

## Technical Notes

- The KB data tables (tower_inventory, competitor_pricing) are already injected into all three prompts via `formatKBForStage3`, `formatKBForScenarioPrompt`, and inline JSON in cross-sell. The new guardrail text simply instructs the LLM to use that data strictly.
- Rule numbering in each prompt continues from the existing rules in that prompt to avoid confusion.

