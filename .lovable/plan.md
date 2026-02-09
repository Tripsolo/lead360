

# Plan: Make NBA/TP Selection Deterministic (Patch 2)

## Problem

Stage 3 (Gemini Flash) navigates a 43-TP x 49-NBA x 13-persona matrix via prompt engineering, frequently selecting wrong IDs. The matrix is already structured in code (`PERSONA_OBJECTION_MATRIX`) and should be looked up deterministically, with the LLM only contextualizing the pre-selected items.

## Changes

### File 1: `supabase/functions/analyze-leads/index.ts`

**Update imports (line 3-8):** Add `normalizePersona`, `detectObjectionCategories`, `mapToMatrixObjection`, `lookupMatrixEntry`, `getTalkingPointDef` to the import from `nba-framework.ts`.

**Add deterministic pre-selection block (insert between line 2938 and line 2940):** Before the `// ===== STAGE 3` comment, add a block that:
- Declares `preSelectedNba`, `preSelectedTpIds`, `preSelectedObjection` (all null/empty initially)
- Only runs if `parseSuccess` is true
- Gets visit comments, calls `normalizePersona()`, `detectObjectionCategories()`, `checkSafetyConditions()`
- If safety triggered: looks up override NBA via `getNBARuleDef()`, gets TP IDs from `linked_talking_points`
- If not safety but objections detected: calls `mapToMatrixObjection()` for primary objection, then `lookupMatrixEntry()` to get matrix entry with `nba_id` and `tp_ids`, looks up full NBA rule
- Logs the pre-selection result

**Update both `buildStage3Prompt` call sites (~lines 2954 and 2996):** Pass `preSelectedNba` and `preSelectedTpIds` as last two arguments.

### File 2: `supabase/functions/analyze-leads/nba-framework.ts`

**Update `buildStage3Prompt()` signature (line 2135-2142):** Add two optional parameters: `preSelectedNba?: any`, `preSelectedTpIds?: string[]`.

**Add pre-selection injection block (after kbSection, ~line 2343):** Build a `preSelectionSection` string:
- If `preSelectedNba` and `preSelectedTpIds` are provided and non-empty: look up each TP via `getTalkingPointDef()`, build a prompt section titled "PRE-SELECTED NBA & TALKING POINTS (MANDATORY -- DO NOT OVERRIDE)" with full NBA details and TP definitions, instructing the LLM to only contextualize
- Otherwise: empty string

**Update return template (line 2345):** Insert `${preSelectionSection}` between `${kbSection}` and `${frameworkSection}`.

## No other files changed

All helper functions are already exported from `nba-framework.ts`. Types and UI untouched.

