

# Fix PPS Score Display in Rating Rationale + Verify Polling UI Updates

## Summary

Two changes are needed:
1. **Remove PPS Score from rating_rationale prompt** - The LLM is currently instructed to include "**PPS Score: X/100.**" in the rating_rationale, but this should not appear there since there's a separate PPS Score field displayed in the UI.
2. **Verify real-time polling updates** - The polling mechanism exists and calls `updateLeadsWithAnalyses()` but may benefit from a small enhancement to ensure UI refreshes immediately.

---

## Issue 1: PPS Score Appearing in Rating Rationale

### Root Cause

**File:** `supabase/functions/analyze-leads/index.ts`  
**Line 1846:** The OUTPUT STRUCTURE prompt explicitly instructs the LLM to include PPS Score:

```typescript
"rating_rationale": "**PPS Score: X/100.** Brief explanation of key scoring factors without rating label"
```

### Memory Context Violation

Per `memory/llm-output/pps-score-output-constraint`:
> "PPS Score numbers must never appear in rating_rationale, persona_description, or summary sections of lead analysis output."

### Technical Fix

**File:** `supabase/functions/analyze-leads/index.ts`  
**Line 1846:** Update the rating_rationale instruction:

FROM:
```typescript
"rating_rationale": "**PPS Score: X/100.** Brief explanation of key scoring factors without rating label",
```

TO:
```typescript
"rating_rationale": "Brief 2-3 sentence explanation of key scoring factors that determined this lead's rating. Focus on financial capability, intent signals, and timeline urgency. Do NOT include the PPS score value - it is displayed separately.",
```

---

## Issue 2: Real-time Polling UI Updates

### Current Implementation

The polling mechanism in `Index.tsx` (lines 440-498) already:
- Polls every 3 seconds
- Calls `updateLeadsWithAnalyses()` with partial results at line 470
- Uses functional state updates to avoid stale closures

### Verification Needed

The polling logic appears correct. The issue you experienced (ratings visible only after all processing complete) may have been caused by:
1. **Network errors on batch initiation** (as we saw with FunctionsFetchError) - some batches never started processing
2. **Toast notification overload** - multiple toasts stacking and obscuring the table updates
3. **UI rendering delay** - table not re-rendering during rapid state updates

### Optional Enhancement

Add a force re-render trigger after each poll update to ensure the table reflects changes:

**File:** `src/pages/Index.tsx`  
**Lines 468-476:** Add a key-based refresh:

```typescript
// Update UI with partial results
if (analyses && analyses.length > 0) {
  updateLeadsWithAnalyses(analyses);
  const percentComplete = Math.round((analyses.length / leadIdsToCheck.length) * 100);
  
  // Toast less frequently to avoid spam
  if (percentComplete % 25 === 0 || analyses.length === leadIdsToCheck.length) {
    toast({
      title: 'Analysis in progress',
      description: `${percentComplete}% complete (${analyses.length}/${leadIdsToCheck.length} leads)...`,
    });
  }
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/analyze-leads/index.ts` | Line 1846: Remove PPS Score from rating_rationale prompt instruction |
| `src/pages/Index.tsx` | Optional: Reduce toast frequency during polling to improve performance |

---

## Expected Outcome

After implementation:
1. **Rating Rationale** will contain only qualitative scoring explanations without the PPS Score reference
2. **PPS Score** continues to display separately in the "AI Rating" section of the Lead Report Modal
3. **Polling UI** will continue to update ratings as they arrive (behavior was already correct, issue was likely network-related batch failures)

---

## Re-analysis Recommendation

After deploying the prompt change, you'll need to **re-analyze leads** for the updated rating_rationale format to take effect. Existing cached analyses will still show the old format with PPS Score until re-analyzed.

