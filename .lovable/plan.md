

# Plan: Fix Null Budget Handling in Cross-Sell (Patch 4)

## Problem

When Stage 1 fails to extract a budget from sparse CRM comments, `buildCrossSellPrompt()` treats null budget as an automatic PASS for Rule 1 (Budget Ceiling). This means the cross-sell engine can recommend expensive projects (e.g., 4.5Cr Immensa) to leads who may only afford 80L -- a potentially damaging sales recommendation.

## Changes

### File: `supabase/functions/analyze-leads/index.ts`

Three targeted text changes inside the `buildCrossSellPrompt()` function's prompt string:

**Change 4a -- Line 1082: Update RULE 1 null-budget behavior**

Replace:
```
- If budget is not stated, this rule passes automatically.
```
With:
```
- If budget is not stated (null), this rule FAILS. You cannot validate budget fit without a stated budget. Set budget_check to "FAIL" and do NOT recommend a cross-sell project. The sales team should first discover the customer's budget before making cross-sell recommendations.
```

**Change 4b -- Line 1088: Add RTMI clarification to RULE 2**

After the existing line:
```
- If lead has no specific possession urgency, this rule passes automatically.
```
Add:
```
- However, if lead explicitly needs RTMI and no sister project has is_rtmi=true AND earliest oc_date > 8 months from today, this rule FAILS.
```

**Change 4c -- Lines 1138-1142: Add null-budget output instruction**

After the existing "no sister project" fallback block, add a new block:
```
If budget_stated is null/not available, return:
{
  "cross_sell_recommendation": null,
  "evaluation_log": "Budget not stated - cannot validate cross-sell affordability. Discover budget first."
}
```

## No other files changed

All changes are within the LLM prompt string in `buildCrossSellPrompt()`. No logic, types, or UI changes needed.

