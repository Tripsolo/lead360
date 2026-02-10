

# Plan: Add Budget Constraint & Investment Goal Alignment Guardrails

## Problem

Currently, Talking Points and NBAs can reference projects, configurations, or strategies that are outside the lead's budget or misaligned with their investment goal (e.g., suggesting a 4BHK luxury unit to someone with a 1 Cr budget, or pitching rental yield to an end-use family buyer). The cross-sell prompt has a 20% budget ceiling, but no equivalent constraint exists for TP/NBA generation.

## Analysis of Existing Rules

| Area | Budget Constraint | Investment Goal Alignment |
|------|------------------|--------------------------|
| Cross-sell (index.ts) | 20% ceiling (Rule 1) -- already present, will update to 25% | Not explicitly enforced |
| Stage 3B Matrix (nba-framework.ts) | None | Persona-TP rules exist (Rules 5-6) but no explicit budget-fit rule for TPs |
| Stage 3B Scenario (nba-scenario-framework.ts) | Safety override mentions budget fit | No explicit rule |
| Evaluator (evaluator.ts) | Rule 4 validates cross-sell budget only | Rule 8 checks investor persona TPs only |

## Changes

### 1. Stage 3B Matrix Variant (`nba-framework.ts`)

Add two new rules to the FACTUAL GUARDRAILS section (after Rule 11):

```
12. **Budget-Fit Constraint (Non-Negotiable)**: The lead's stated budget is a hard constraint 
    with a maximum 25% flexibility threshold. 
    - Do NOT reference or recommend any project, tower, or config where closing_price_min_cr 
      exceeds (lead_budget x 1.25).
    - Do NOT suggest upgrades, premium floors, or larger configs that push beyond this threshold.
    - If the lead's budget is not stated, do NOT make price-based arguments or suggest specific 
      units — focus on experience-based talking points instead.
    - Example: Lead budget = ₹1.5 Cr → max allowable = ₹1.875 Cr. Do NOT pitch a 3BHK at ₹2.1 Cr.

13. **Investment Goal Alignment (Non-Negotiable)**: The lead's core_motivation and 
    customer_buying_goal define the framing of ALL talking points and NBAs.
    - If goal = "investment/rental/ROI/appreciation" → Frame ALL arguments around returns, 
      appreciation, rental yield, capital growth. NEVER use family/lifestyle/school arguments.
    - If goal = "end-use/family/upgrade/self-use" → Frame ALL arguments around lifestyle, 
      convenience, family amenities, community. NEVER use pure ROI/investment language.
    - If goal is unclear or mixed → Default to end-use framing but include one investment data 
      point if relevant.
    - This rule overrides persona-based TP selection if there is a conflict.
```

### 2. Stage 3B Scenario Variant (`nba-scenario-framework.ts`)

Add the same two rules to the FACTUAL GUARDRAILS section (after Rule 9):

```
10. **Budget-Fit Constraint (Non-Negotiable)**: The lead's stated budget has a maximum 25% 
    flexibility threshold. Do NOT reference projects/configs where closing_price_min_cr > 
    (lead_budget x 1.25). If budget is not stated, avoid price-based arguments entirely.

11. **Investment Goal Alignment (Non-Negotiable)**: The customer_buying_goal from Classification 
    (or core_motivation) defines argument framing. Investment goals get ROI/appreciation arguments 
    only. End-use goals get lifestyle/family arguments only. Never cross-contaminate.
```

### 3. Cross-Sell Prompt (`index.ts`)

Update Rule 1 budget ceiling from 20% to 25% to match the new unified threshold:

```
### RULE 1: BUDGET CEILING (25% MAX)
- The recommended project's entry price (closing_price_min_cr for matching config) must NOT 
  exceed 125% of the lead's stated budget.
- Formula: IF (closing_price_min_cr > lead_budget * 1.25) THEN REJECT
```

Also update the evaluation process reference and the inline cross-sell rules in Stage 2 prompt (lines 2014-2018) to use 1.25 instead of 1.20.

### 4. Evaluator (`evaluator.ts`)

Add Rule 16 (Budget-Fit for TPs) and Rule 17 (Goal Alignment):

```
### Rule 16: Talking Point Budget-Fit Validation (NON-NEGOTIABLE)
If lead has a stated budget (budget_stated_cr is not null):
1. Check each talking point for project/config references with specific pricing
2. If any TP references a unit/config where closing_price_min_cr > (budget_stated_cr x 1.25) 
   → CORRECT: Remove the over-budget reference or replace with a budget-appropriate alternative
3. If a TP suggests an "upgrade" to a larger config, verify the upgrade price is within 25% 
   threshold
4. Add to corrections_made: "TP removed/corrected: referenced unit exceeds 25% budget threshold"

### Rule 17: Investment Goal Alignment Validation
Check core_motivation / customer_buying_goal against talking point content:
1. If goal contains "investment/rental/ROI/appreciation" AND any TP uses family/lifestyle 
   arguments (school, children, community, family) → CORRECT: Replace with investment-focused TP
2. If goal contains "family/end-use/upgrade/self-use" AND any TP uses pure investment language 
   (ROI, rental yield, capital appreciation, returns) → CORRECT: Replace with lifestyle-focused TP
3. Add to corrections_made: "TP goal-alignment corrected: [investment/end-use] framing applied"
```

Also update Rule 4 (cross-sell budget validation) to use the new 25% threshold (1.25 instead of 1.20).

### 5. Update Evaluator Lead Context

In `buildEvaluatorPrompt`, add `core_motivation` and `customer_buying_goal` to the lead context object passed to the evaluator so it can validate goal alignment:

```typescript
const leadContext = {
  persona: ...,
  objections_detected: ...,
  budget_stated: ...,
  rating: ...,
  core_motivation: extractedSignals?.core_motivation || "Unknown",
  customer_buying_goal: stage3AClassification?.customer_buying_goal || "Unknown",
};
```

## What Does NOT Change

- Stage 3A classification prompts (these classify, not generate)
- Stage 1 and Stage 2 prompts
- Database schema and UI
- Evaluator Rules 1-15 (unchanged, only additions)
- The existing persona-based TP rules (5-6 in matrix) remain as complementary checks

## Summary of Threshold

- Unified 25% budget flexibility across all generation and validation:
  - Cross-sell Rule 1: 25% (updated from 20%)
  - TP/NBA generation: 25% (new)
  - Evaluator cross-sell check: 25% (updated from 20%)
  - Evaluator TP check: 25% (new)

