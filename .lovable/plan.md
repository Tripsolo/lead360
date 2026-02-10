

# Plan: Debug and Fix Cross-Sell Recommendation Generation

## Root Cause Analysis

After thorough investigation, the cross-sell pipeline is structurally correct -- the budget extracted in Stage 1 (`budget_stated_cr`) IS already passed to the cross-sell prompt. The sister project metadata DOES contain pricing data that maps to `closing_price_min_cr`/`closing_price_max_cr`.

However, three issues likely cause zero recommendations:

1. **Silent failure swallowing**: If Gemini 3 Flash returns malformed JSON, the `catch` block silently returns `null` with no diagnostic logging
2. **"metadata_fallback" label discouraging the LLM**: The prompt header says "with CLOSING PRICES from Tower Inventory" but the data shows `data_source: "metadata_fallback"`, and a separate instruction says metadata_fallback has "lower confidence" -- this may cause the LLM to be overly conservative
3. **No diagnostic logging**: When cross-sell returns null, only the `evaluation_log` string from the LLM is logged -- if JSON parsing fails, even that is lost

## Changes (all in `supabase/functions/analyze-leads/index.ts`)

### 1. Add Diagnostic Logging to Cross-Sell API Call

In `callCrossSellAPI()` (around line 964-968), add logging for the raw response text BEFORE parsing, so we can see what the LLM actually returned even if JSON parsing fails.

### 2. Add Detailed Logging at Stage 2.5 Invocation

At the Stage 2.5 block (around line 2974-2998), log:
- The lead's `budget_stated_cr` value being passed
- The sister project configs and their closing prices
- The raw cross-sell result before checking for null

This will make it immediately visible WHY cross-sell returns null for each lead.

### 3. Fix Prompt Wording for Metadata Fallback

Update the prompt section header at line 1145 from:
```
## SISTER PROJECTS AVAILABLE (with CLOSING PRICES from Tower Inventory)
```
to:
```
## SISTER PROJECTS AVAILABLE (with CLOSING PRICES)
```

And update line 1127 from:
```
- If closing_price fields are null, the data source is "metadata_fallback" and has lower confidence
```
to:
```
- If closing_price fields are null, budget comparison cannot be performed. If closing_price fields are populated (even from metadata), treat them as valid for evaluation.
```

This removes the "lower confidence" bias that may discourage the LLM from making recommendations when metadata-sourced prices are available.

### 4. Add Explicit Instruction to Use Metadata Prices

Add a clarifying note in the evaluation process section (after line 1193):
```
6. The data_source field is for tracking only. If closing_price_min_cr and closing_price_max_cr are populated, use them for Rule 1 evaluation regardless of whether data_source is "tower_inventory" or "metadata_fallback".
```

## What Does NOT Change

- Stage 1 budget extraction logic (already works correctly)
- Stage 2 scoring and persona logic
- The 4 cross-sell guardrail rules themselves
- The null-budget guardrail (budget must be stated for cross-sell)
- Stage 3, Stage 4, or any other pipeline stage
- Database schema
- UI components

## Expected Outcome

After these changes, re-running analysis on uploaded leads should:
- Show detailed logs for each cross-sell evaluation (budget, configs, LLM response)
- Remove the metadata_fallback confidence penalty that likely caused the LLM to reject valid recommendations
- Make it easy to diagnose if any remaining leads still get no recommendation and why

