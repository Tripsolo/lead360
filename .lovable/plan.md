

# Plan: Reduce Chunk Size to 1 Lead Per Function Call

## Summary

Change the `CHUNK_SIZE` from 2 to 1 in both the main analysis flow and the re-analysis flow. This ensures each edge function invocation processes only one lead, staying well within the ~150-second platform timeout.

## Changes

### 1. Main analysis flow (`src/pages/Index.tsx`, line 671)

Change `CHUNK_SIZE` from `2` to `1` and update the comment:

```
// Before
const CHUNK_SIZE = 2;

// After
const CHUNK_SIZE = 1;
```

### 2. Re-analysis flow (`src/pages/Index.tsx`, line 909)

Same change for the re-analysis batch:

```
// Before
const CHUNK_SIZE = 2;

// After
const CHUNK_SIZE = 1;
```

### 3. Update inter-batch delay (lines 741, 934)

Increase the delay between calls from 500ms to 2000ms to avoid rate-limiting when sending more individual calls:

```
// Before
await new Promise(resolve => setTimeout(resolve, 500));

// After
await new Promise(resolve => setTimeout(resolve, 2000));
```

## What Does NOT Change

- Edge function code (no changes to `analyze-leads/index.ts`)
- Polling logic for results
- Database schema or UI layout
- All other stages and prompts

## Technical Notes

- With `CHUNK_SIZE = 1`, a batch of N leads will trigger N sequential function calls (each awaited before the next starts), with 2-second gaps between them
- Each call gets the full ~150-second budget for one lead's pipeline (Stage 1A, 1B, 2, 3A, 3B, 4, Cross-Sell)
- The polling mechanism already handles incremental results, so the UI will update as each lead completes

