

# Plan: Add Descriptive Concern Details from Stage 3A to Key Concerns Display

## Problem

Currently, `key_concerns` from Stage 2 contains the same category labels as `concern_categories` (e.g., both say "Price", "Location"). In the UI (LeadReportModal, LeadCard), a badge shows the category and the text below it repeats the same word -- making it redundant.

Stage 3A already extracts `primary_objection_detail` (a descriptive sentence like "Budget gap - wants UC at lower price point"), but this never flows back to update `key_concerns`.

## Solution

Enrich `key_concerns` with descriptive text from Stage 3A's classification output, so each concern shows a category badge AND a meaningful description.

## Changes

### 1. Add `secondary_objection_details` to Stage 3A output schema (both variants)

**Files**: `nba-framework.ts`, `nba-scenario-framework.ts`

In both `buildStage3AClassificationPrompt` and `buildStage3AScenarioClassificationPrompt`, update the output schema to include a new field:

```json
{
  "primary_objection_category": "Economic Fit",
  "primary_objection_detail": "Budget gap - wants UC at lower price point",
  "secondary_objections": ["Competition", "Possession Timeline"],
  "secondary_objection_details": ["Comparing with Lodha Amara on price per sqft", "Needs possession within 18 months"],
  ...
}
```

Add a classification instruction:
```
3. **Secondary Objections**: Other concern categories (0-3), each with a brief description (max 10 words)
```

And add `"secondary_objection_details"` to the JSON output template, described as: `["Brief description of each secondary objection (max 10 words each, same order as secondary_objections)"]`

Also add a constraint to `primary_objection_detail`: `(max 10 words)`

### 2. Override `key_concerns` after Stage 3A completes (index.ts)

In `index.ts`, after Stage 3A classification succeeds (for both matrix and scenario variants), rebuild `key_concerns` and `concern_categories` from 3A output:

```typescript
// After 3A classification succeeds, override key_concerns with descriptive text
if (stage3AClassification) {
  const newKeyConcerns: string[] = [];
  const newConcernCategories: string[] = [];
  
  if (stage3AClassification.primary_objection_category) {
    newConcernCategories.push(stage3AClassification.primary_objection_category);
    newKeyConcerns.push(stage3AClassification.primary_objection_detail || stage3AClassification.primary_objection_category);
  }
  
  if (stage3AClassification.secondary_objections?.length) {
    stage3AClassification.secondary_objections.forEach((cat: string, i: number) => {
      newConcernCategories.push(cat);
      newKeyConcerns.push(
        stage3AClassification.secondary_objection_details?.[i] || cat
      );
    });
  }
  
  analysisResult.key_concerns = newKeyConcerns;
  analysisResult.concern_categories = newConcernCategories;
  analysisResult.primary_concern_category = stage3AClassification.primary_objection_category || analysisResult.primary_concern_category;
}
```

This goes right after the `stage3AClassification` variable is set, before Stage 3B is called (so it also flows into the DB update).

### 3. No UI changes needed

The UI already renders this correctly:
- `LeadReportModal.tsx` (line 401-409): Shows a badge with `concern_categories[idx]` and the text from `key_concerns[idx]` below it
- `LeadCard.tsx` (line 159): Shows `key_concerns` as list items

With descriptive text in `key_concerns`, the badge will show "Price" and the text below will show "Budget gap - wants UC at lower price" instead of repeating "Price".

## What Does NOT Change

- Stage 2 prompt (still outputs `key_concerns` as categories -- serves as fallback if 3A fails)
- Stage 3B generation logic
- Stage 4 evaluator
- Database schema (key_concerns is already a JSON array of strings)
- UI components (already structured to show category badge + concern text)

