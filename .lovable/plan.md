

# Plan: Switch Fallback Models to Gemini 3 Pro Preview

## Summary

Keep Claude Sonnet 4.5 (via OpenRouter) as the primary model for Stage 2 and Stage 3. Replace the current fallback models with Gemini 3 Pro Preview. Remove the rule-based hardcoded defaults fallback from Stage 2.

## Current vs New Model Chains

| Stage | Current Chain | New Chain |
|-------|--------------|-----------|
| Stage 2 | Claude Sonnet 4.5 -> Gemini 2.5 Pro -> Rule-based defaults | Claude Sonnet 4.5 -> Gemini 3 Pro Preview |
| Stage 3 (Matrix) | Claude Sonnet 4.5 -> Gemini 2.5 Flash | Claude Sonnet 4.5 -> Gemini 3 Pro Preview |
| Stage 3 (Scenario) | Claude Sonnet 4.5 -> Gemini 2.5 Flash | Claude Sonnet 4.5 -> Gemini 3 Pro Preview |

## Changes (all in `supabase/functions/analyze-leads/index.ts`)

### 1. New Helper Function: `callGemini3ProAPI()`

Add a helper function targeting `gemini-3-pro-preview` via the Google Generative AI REST API. Uses the existing `GOOGLE_AI_API_KEY`. Placed after the existing `callGeminiAPI()` function.

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`
- Same retry logic, JSON mode support, and error handling as existing Gemini helpers

### 2. Stage 2: Replace Fallback + Remove Rule-Based Defaults

In the Stage 2 fallback block:
- Replace `callGeminiAPI()` (Gemini 2.5 Pro) with `callGemini3ProAPI()`
- Update fallback model label to `"gemini-3-pro-preview"`
- Remove the inner catch block that falls back to rule-based hardcoded defaults (Warm rating, generic persona). If both primary and fallback fail, let `parseSuccess = false` and the pipeline handles it naturally.

### 3. Stage 3 Matrix Variant: Replace Fallback

In the matrix Stage 3 fallback block:
- Replace `callGemini3FlashAPI()` / `callGeminiFlashAPI()` (Gemini 2.5 Flash) with `callGemini3ProAPI()`
- Update fallback model label to `"gemini-3-pro-preview"`

### 4. Stage 3 Scenario Variant: Replace Fallback

In the scenario Stage 3 fallback block:
- Replace the Gemini 2.5 Flash fallback with `callGemini3ProAPI()`
- Update fallback model label to `"gemini-3-pro-preview (scenario)"`

## What Does NOT Change

- Primary model for Stage 2 and Stage 3: Claude Sonnet 4.5 via OpenRouter (unchanged)
- Stage 1: Stays on its current models
- Stage 2.5 (Cross-Sell): Stays on its current model
- Stage 4 (Evaluator): Stays on Claude Sonnet 4.5 via OpenRouter
- All prompt content remains identical
- No database or schema changes
- The `callOpenRouterAPI()` function stays as-is (still primary for Stages 2, 3, and 4)

## Technical Notes

- Gemini 3 Pro Preview uses the same `GOOGLE_AI_API_KEY` as other Gemini helpers -- no new secrets needed
- The Gemini API uses a single `contents` array format, so fallback calls will use combined prompt strings (same pattern as existing Gemini fallbacks)
- `maxOutputTokens` stays at 8192

