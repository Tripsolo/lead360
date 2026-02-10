
# Plan: Fix Cross-Sell Budget Extraction Fallback

## Root Cause

The logs confirm: **`budget_stated_cr=null` for every lead** at Stage 2.5. The cross-sell prompt builder (`buildCrossSellPrompt`) only reads the budget from Stage 1 output (`extractedSignals.financial_signals.budget_stated_cr`). When Stage 1 (Gemini Flash) fails to extract a budget from CRM comments, the cross-sell prompt shows "Stated Budget: Not stated", and the LLM correctly returns null per Rule 1.

However, **Stage 2 (Claude Sonnet 4.5) separately extracts `budget_stated` into `analysisResult.extracted_signals.budget_stated`** -- this value is never checked by the cross-sell logic. So even when Stage 2 successfully extracts a budget, it's ignored.

Additionally, the **diagnostic log at line 2983** has a bug: it reads `extractedSignals?.budget_stated_cr` (flat path) instead of `extractedSignals?.financial_signals?.budget_stated_cr` (nested path), so the log always shows null even if Stage 1 did extract it.

## Changes (all in `supabase/functions/analyze-leads/index.ts`)

### 1. Add budget fallback in `buildCrossSellPrompt`

At line 1112, change the budget extraction to try Stage 1 first, then fall back to Stage 2's extracted budget:

```
// Before:
const leadBudget = extractedSignals?.financial_signals?.budget_stated_cr || null;

// After:
const leadBudget = extractedSignals?.financial_signals?.budget_stated_cr 
  || analysisResult?.extracted_signals?.budget_stated 
  || null;
```

This requires passing `analysisResult` to the function (it's already passed -- it's the first parameter).

### 2. Fix diagnostic log path

At line 2983, fix the log to use the correct nested path:

```
// Before:
const leadBudgetForLog = extractedSignals?.budget_stated_cr ?? analysisResult?.extracted_signals?.budget_stated_cr ?? null;

// After:
const leadBudgetForLog = extractedSignals?.financial_signals?.budget_stated_cr ?? analysisResult?.extracted_signals?.budget_stated ?? null;
```

### 3. Add Stage 1 budget extraction diagnostic log

After Stage 1 completes (around line 2847), add a log to track whether budget was extracted:

```
console.log(`Stage 1 budget for lead ${lead.id}: ${extractedSignals?.financial_signals?.budget_stated_cr ?? 'null'}`);
```

## What Does NOT Change

- Stage 1 extraction prompt (no changes)
- Stage 2 scoring logic
- Cross-sell guardrail rules (Rule 1-5 stay the same)
- Stage 3, Stage 4
- UI components
- Database schema

## Expected Outcome

After this fix, leads where Stage 2 (Claude) extracts a budget but Stage 1 (Gemini) missed it will now have their budget passed to the cross-sell prompt. This should unblock cross-sell recommendations for leads that do have budget information in their CRM data.
