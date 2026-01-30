
# Fix Analyze-Leads Model Name and Database Save Issues

## Problem Summary

Two issues are causing lead analysis to fail:

1. **Wrong Gemini Model Name**: The `callGemini3FlashAPI` function uses `gemini-2.5-flash-preview-05-20` instead of `gemini-3-flash-preview`, causing 404 API errors
2. **Silent Database Save Failure**: The `storeAnalysisResult` function doesn't check for upsert errors, so successful API analysis isn't persisted

## Root Cause Analysis

### Issue 1: Model Name Error
```text
Error in logs:
"models/gemini-2.5-flash-preview-05-20 is not found for API version v1beta"

Location: supabase/functions/analyze-leads/index.ts, line 580
Current:  gemini-2.5-flash-preview-05-20
Expected: gemini-3-flash-preview
```

### Issue 2: Silent Upsert Failure
```text
Location: supabase/functions/analyze-leads/index.ts, line 2051
Problem: await supabase.from("lead_analyses").upsert(...) 
         - No error checking on result
         - Failures are silently ignored
```

---

## Technical Fix

### 1. Correct the Model Name in callGemini3FlashAPI

**File:** `supabase/functions/analyze-leads/index.ts`

**Line 580:** Change the API endpoint URL from:
```typescript
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${googleApiKey}`
```

To:
```typescript
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`
```

### 2. Add Error Handling to storeAnalysisResult

**File:** `supabase/functions/analyze-leads/index.ts`

**Lines 2051-2061:** Modify to check for errors:

```typescript
async function storeAnalysisResult(result: any, projectId: string, leadsToAnalyze: any[]) {
  if (result.parseSuccess) {
    const lead = leadsToAnalyze.find((l) => l.id === result.leadId);
    if (!lead) return;

    const { error } = await supabase.from("lead_analyses").upsert(
      {
        lead_id: lead.id,
        project_id: projectId,
        rating: result.rating,
        insights: result.insights,
        full_analysis: result.fullAnalysis,
        revisit_date_at_analysis: result.revisitDate || null,
      },
      { onConflict: "lead_id,project_id" },
    );
    
    if (error) {
      console.error(`Failed to store analysis for lead ${lead.id}:`, error.message);
    } else {
      console.log(`Stored analysis for lead ${lead.id} with rating ${result.rating}`);
    }
  }
}
```

---

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `supabase/functions/analyze-leads/index.ts` | 580 | Fix model name from `gemini-2.5-flash-preview-05-20` to `gemini-3-flash-preview` |
| `supabase/functions/analyze-leads/index.ts` | 2051-2061 | Add error handling and logging to `storeAnalysisResult` function |

---

## Expected Outcome

After the fix:
1. Stage 1 and Stage 3 will use the correct Gemini 3 Flash model (no more 404 errors)
2. Database save errors will be logged, making debugging easier
3. Lead analysis results will persist correctly to the database
4. The lead Ganesh Dumolia will receive a proper AI rating on re-analysis

---

## Validation Steps

1. Deploy the updated edge function
2. Re-analyze the lead (Ganesh Dumolia - 006fv0000074xOr)
3. Check edge function logs for:
   - "Stage 1 complete for lead ... using gemini-3-flash-preview" (no fallback)
   - "Stored analysis for lead ... with rating ..."
4. Verify the database has the analysis record

