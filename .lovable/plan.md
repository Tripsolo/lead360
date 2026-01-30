# Stage 3: NBA & Talking Points Generation - IMPLEMENTATION COMPLETE

## Status: ✅ COMPLETED

This implementation separates NBA (Next Best Action) and Talking Points generation from Stage 2 (Lead Scoring) into a dedicated Stage 3 prompt using a decision tree framework.

---

## What Was Implemented

### 1. Framework Constants (`nba-framework.ts`) ✅
- 43 Talking Points with TP-IDs (TP-ECO-001 through TP-SPEC-005)
- 49 NBA Rules with NBA-IDs (NBA-COM-001 through NBA-SPEC-003)
- 12 Persona definitions mapped to matrix
- 8 Objection Categories with detection keywords
- Persona-Objection Matrix (12×14 mappings)
- Helper functions: `detectObjectionCategories()`, `normalizePersona()`, `lookupMatrixEntry()`, `checkSafetyConditions()`, `buildFrameworkSubset()`

### 2. Stage 3 Prompt Builder (`buildStage3Prompt()`) ✅
- Takes Stage 2 output + extracted signals + visit comments
- Builds relevant framework subset (token-optimized)
- Generates persona-specific matrix excerpt
- Includes safety rule checks in prompt
- Outputs structured JSON with NBA-ID, TP-IDs, and contextualized text

### 3. Pipeline Integration (`index.ts`) ✅
- Stage 3 called after Stage 2 completes
- 200ms delay between Stage 2 and Stage 3
- Code-level safety validation (overrides LLM if needed)
- Results merged into final analysis output
- Fallback: If Stage 3 fails, analysis still succeeds with Stage 2 data

### 4. Type Updates (`lead.ts`) ✅
- `next_best_action` now includes `nba_id`, `action_type`, `escalation_trigger`, `fallback_action`
- `talking_points` now includes `tp_id`, `source_text`
- Added `objection_categories_detected`, `primary_objection`, `secondary_objections`
- Added `safety_check_triggered` field

### 5. Frontend Updates ✅
- `LeadReportModal.tsx`: Displays action type badges, TP-IDs, safety warnings
- `LeadCard.tsx`: Shows NBA action category badge
- Backward compatible with old analyses

---

## Architecture

```text
┌──────────────────────┐      ┌──────────────────────────┐      ┌───────────────────────────┐
│ Stage 1              │ ───▶ │ Stage 2                  │ ───▶ │ Stage 3                   │
│ Signal Extraction    │      │ Scoring + Persona        │      │ NBA + Talking Points      │
│ (CRM + MQL parsing)  │      │ + Concerns + Summary     │      │ (Decision Tree Framework) │
└──────────────────────┘      └──────────────────────────┘      └───────────────────────────┘
        ~20s                          ~15s                              ~10s
```

---

## Safety Rules Enforced

1. **75+ RTMI Mandatory**: If age > 75 AND (urgent possession OR Settlement Seeker persona), auto-triggers NBA-ESC-004
2. **Vastu-Rigid Filter**: Vastu-Rigid Buyer gets compliant inventory recommendations only
3. **Settlement Seeker Redirect**: Always redirected to RTMI/Resale options

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/analyze-leads/nba-framework.ts` | Created framework constants + Stage 3 prompt builder |
| `supabase/functions/analyze-leads/index.ts` | Added Stage 3 call, removed TP/NBA from Stage 2 output |
| `src/types/lead.ts` | Enhanced NBA and TP type definitions |
| `src/components/LeadReportModal.tsx` | Display NBA action type, TP-IDs |
| `src/components/LeadCard.tsx` | Action type badge display |
