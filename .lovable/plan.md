

# Fix Excel Date Conversion in Analyze-Leads Edge Function

## Problem Summary

The database save is failing with this error:
```text
Failed to store analysis for lead 006fv0000074xOr: invalid input syntax for type timestamp with time zone: "45959.7375"
```

The value `45959.7375` is an **Excel serial date number** (representing a date like October 2025), but PostgreSQL expects an ISO timestamp format like `2025-10-05T17:42:00.000Z`.

## Root Cause

The `revisitDate` field is read directly from raw Excel data without conversion:

```typescript
// Line 2041 & 2433
revisitDate: lead.rawData?.["Latest Revisit Date"] || null,
```

This raw Excel serial number is then passed to the database:

```typescript
// Line 2058
revisit_date_at_analysis: result.revisitDate || null,
```

---

## Technical Fix

### 1. Add Excel Date Conversion Helper

Add the `excelDateToISOString` function to the edge function (same logic as in `src/pages/Index.tsx`):

```typescript
function excelDateToISOString(excelDate: any): string | null {
  if (!excelDate) return null;
  
  // If it's already a valid ISO string or date string, return as-is
  if (typeof excelDate === 'string' && isNaN(Number(excelDate))) {
    return excelDate;
  }
  
  // If it's a number (Excel serial date), convert it
  if (typeof excelDate === 'number' || !isNaN(Number(excelDate))) {
    const numDate = Number(excelDate);
    // Excel dates start from 1900-01-01 (serial 1)
    // JavaScript Date epoch adjustment: Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + numDate * 24 * 60 * 60 * 1000);
    return jsDate.toISOString();
  }
  
  return null;
}
```

### 2. Apply Conversion When Setting revisitDate

Update the two locations where `revisitDate` is set:

**Location 1 (Line ~2041):**
```typescript
// Before:
revisitDate: lead.rawData?.["Latest Revisit Date"] || null,

// After:
revisitDate: excelDateToISOString(lead.rawData?.["Latest Revisit Date"]),
```

**Location 2 (Line ~2433):**
```typescript
// Before:
revisitDate: lead.rawData?.["Latest Revisit Date"] || null,

// After:
revisitDate: excelDateToISOString(lead.rawData?.["Latest Revisit Date"]),
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-leads/index.ts` | Add `excelDateToISOString` helper function, apply conversion at lines ~2041 and ~2433 |

---

## Expected Outcome

After the fix:
1. Excel serial dates like `45959.7375` will be converted to ISO format like `2025-10-05T17:42:00.000Z`
2. The database upsert will succeed
3. Lead analysis results will be properly stored
4. The lead Ganesh Dumolia will show an AI rating in the UI

---

## Validation Steps

1. Deploy the updated edge function
2. Re-analyze the lead (Ganesh Dumolia - 006fv0000074xOr)
3. Check edge function logs for:
   - `"Stored analysis for lead 006fv0000074xOr with rating ..."` (success message)
   - No "Failed to store" error
4. Verify the lead shows an AI rating in the UI

