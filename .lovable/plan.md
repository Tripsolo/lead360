

# Plan: Reduce Stage 3 Prompt Size (Patch 5)

## Problem

`buildStage3Prompt()` always injects the full framework section (~8,000-10,000 tokens) containing the entire persona-objection matrix, all relevant TP definitions (with full emotional hooks, logical arguments, competitor counters), and all NBA rule definitions. When pre-selection from Patch 2 is active, this is redundant because the selected TP and NBA details are already in the `preSelectionSection`.

## Changes

### File: `supabase/functions/analyze-leads/nba-framework.ts`

**Replace the static `frameworkSection` (lines 2237-2248) with a conditional block:**

**When pre-selection IS active** (`preSelectedNba` and `preSelectedTpIds` are present and non-empty):
- Replace the full framework with a minimal reference containing:
  - Valid TP-ID format example (e.g., `TP-ECO-007`)
  - Valid NBA-ID format example (e.g., `NBA-OFF-001`)
  - The 3 talking point type definitions (Objection handling, Competitor handling, Highlight)
  - A reminder to use the pre-selected IDs from the mandatory section above

**When pre-selection is NOT active** (fallback mode):
- Still provide the framework, but trimmed:
  - Matrix excerpt: Filter to only rows matching `objectionCategories`, capped at 3 rows via `.slice(0, 3)`
  - TP reference: Max 6 TPs via `.slice(0, 6)`, with abbreviated format (only `talking_point`, `key_data_points`, `emotional_hook` -- skip `logical_argument` and `competitor_counter`)
  - NBA reference: Max 3 NBA rules via `.slice(0, 3)`, with abbreviated format (only `specific_action` and `linked_talking_points` -- skip `trigger_condition` and `data_points_required`)

**Add a prompt length log** after the return template to help verify the reduction.

## Technical Detail

The conditional replaces lines 2237-2248 with an `if/else` block:

```typescript
let frameworkSection = "";
if (preSelectedNba && preSelectedTpIds && preSelectedTpIds.length > 0) {
  // Minimal reference -- actual definitions are in preSelectionSection
  frameworkSection = `# FRAMEWORK REFERENCE (IDs only)
  ...valid ID formats, 3 TP types, reminder to use pre-selected IDs...`;
} else {
  // Trimmed fallback -- filtered matrix rows, abbreviated TPs and NBAs
  const limitedMatrixExcerpt = // filter by objectionCategories, .slice(0, 3)
  const limitedTpRef = // .slice(0, 6), abbreviated fields
  const limitedNbaRef = // .slice(0, 3), abbreviated fields
  frameworkSection = `# DECISION TREE FRAMEWORK (TRIMMED)
  ...limited matrix, TPs, NBAs...`;
}
```

The existing variables (`frameworkSubset`, `personaMatrix`, `matrixExcerpt`, `tpReference`, `nbaReference`) built on lines 2153-2188 are kept for the fallback path but sliced/filtered. The return template on lines 2379-2394 remains unchanged since it already references `${frameworkSection}`.

## Expected Result

- With pre-selection active: prompt drops from ~12,000-15,000 chars to ~4,000-6,000 chars
- Without pre-selection (fallback): prompt drops to ~6,000-8,000 chars (vs full ~12,000-15,000)

## No other files changed

All changes are within `buildStage3Prompt()` in `nba-framework.ts`. No signature, type, or UI changes.
