
# Hybrid Model Architecture: Gemini 3 Flash + Claude Opus 4.5

## Overview

Implement a multi-model pipeline for the `analyze-leads` edge function using direct API calls:
- **Stage 1 & 3**: Google Gemini 3 Flash Preview via direct Gemini API
- **Stage 2**: Claude Opus 4.5 via OpenRouter API

All fallbacks use direct Gemini API (no Lovable AI Gateway).

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        ANALYZE-LEADS PIPELINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Stage 1: Signal Extraction                                         │
│   ├── Primary: gemini-3-flash-preview (Direct Gemini API)           │
│   ├── Fallback: gemini-2.5-flash (Direct Gemini API)                │
│   └── Purpose: Extract structured signals from CRM/MQL data          │
│                                                                      │
│                           ↓                                          │
│                                                                      │
│   Stage 2: PPS Scoring & Persona Generation                          │
│   ├── Primary: anthropic/claude-opus-4.5 (OpenRouter API)           │
│   ├── Fallback: gemini-2.5-pro (Direct Gemini API)                  │
│   └── Purpose: Complex multi-dimensional scoring, persona detection  │
│                                                                      │
│                           ↓                                          │
│                                                                      │
│   Stage 3: NBA & Talking Points Selection                            │
│   ├── Primary: gemini-3-flash-preview (Direct Gemini API)           │
│   ├── Fallback: gemini-2.5-flash (Direct Gemini API)                │
│   └── Purpose: Matrix lookup, safety validation, contextualization   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Model Configuration

| Stage | Primary Model | Primary API | Fallback Model | Fallback API |
|-------|--------------|-------------|----------------|--------------|
| Stage 1 | `gemini-3-flash-preview` | Direct Gemini API | `gemini-2.5-flash` | Direct Gemini API |
| Stage 2 | `anthropic/claude-opus-4.5` | OpenRouter API | `gemini-2.5-pro` | Direct Gemini API |
| Stage 3 | `gemini-3-flash-preview` | Direct Gemini API | `gemini-2.5-flash` | Direct Gemini API |

---

## Technical Implementation

### 1. New API Call Functions

#### callGemini3FlashAPI() - Stage 1 & 3 Primary

```typescript
async function callGemini3FlashAPI(
  prompt: string,
  googleApiKey: string,
  useJsonMode: boolean = true,
  maxRetries: number = 3
): Promise<string>

// Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
// Auth: GOOGLE_AI_API_KEY (already configured)
// Format: Same as existing callGeminiAPI but with gemini-3-flash-preview model
```

#### callGemini25FlashAPI() - Stage 1 & 3 Fallback

```typescript
async function callGemini25FlashAPI(
  prompt: string,
  googleApiKey: string,
  useJsonMode: boolean = true,
  maxRetries: number = 3
): Promise<string>

// Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
// Auth: GOOGLE_AI_API_KEY (already configured)
// Format: Same as existing callGeminiAPI but with gemini-2.5-flash model
```

#### callOpenRouterAPI() - Stage 2 Primary (Claude Opus 4.5)

```typescript
async function callOpenRouterAPI(
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 3
): Promise<string>

// Endpoint: https://openrouter.ai/api/v1/chat/completions
// Auth: OPENROUTER_API_KEY (already configured)
// Model: anthropic/claude-opus-4.5
// Headers: 
//   - Authorization: Bearer ${OPENROUTER_API_KEY}
//   - HTTP-Referer: https://cx360.lovable.app (for OpenRouter attribution)
//   - X-Title: CX360 Lead Analysis
// Format: OpenAI-compatible chat completions
```

#### callGemini25ProAPI() - Stage 2 Fallback

Keep existing `callGeminiAPI()` as-is for Stage 2 fallback (already uses gemini-2.5-pro).

---

### 2. OpenRouter API Call Implementation

```typescript
async function callOpenRouterAPI(
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 3
): Promise<string> {
  const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://cx360.lovable.app",
          "X-Title": "CX360 Lead Analysis"
        },
        body: JSON.stringify({
          model: "anthropic/claude-opus-4.5",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 8192
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }

      const errorText = await response.text();
      
      // Handle rate limits with exponential backoff
      if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`OpenRouter rate limited (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("OpenRouter API error:", errorText);
      lastError = new Error(`OpenRouter call failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`OpenRouter fetch error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error("OpenRouter API call failed after retries");
}
```

---

### 3. Prompt Format Adaptation for Claude

Claude expects OpenAI-compatible message format. The Stage 2 prompt will be split:

**Current format (single prompt string):**
```typescript
const stage2Prompt = buildStage2Prompt(...);
const stage2Response = await callGeminiAPI(stage2Prompt, googleApiKey, true);
```

**New format (system + user messages):**
```typescript
const { systemPrompt, userPrompt } = buildStage2PromptMessages(...);
const stage2Response = await callOpenRouterAPI(systemPrompt, userPrompt);
```

The `buildStage2Prompt()` function will be modified to return both system and user message components, or a new wrapper function will split the existing prompt.

---

### 4. Stage Execution Flow with Fallbacks

#### Stage 1 Execution:
```typescript
let extractedSignals;
let stage1Model = "gemini-3-flash-preview";
try {
  const stage1Response = await callGemini3FlashAPI(stage1Prompt, googleApiKey, true);
  extractedSignals = JSON.parse(stage1Response);
} catch (stage1Error) {
  console.warn(`Stage 1 primary (gemini-3-flash) failed, trying fallback (gemini-2.5-flash)...`);
  stage1Model = "gemini-2.5-flash (fallback)";
  try {
    const stage1Response = await callGemini25FlashAPI(stage1Prompt, googleApiKey, true);
    extractedSignals = JSON.parse(stage1Response);
  } catch (fallbackError) {
    // Use rule-based fallback extraction
    extractedSignals = createFallbackExtraction(lead, mqlEnrichment);
    stage1Model = "rule-based fallback";
  }
}
```

#### Stage 2 Execution:
```typescript
let analysisResult;
let stage2Model = "claude-opus-4.5";
try {
  const { systemPrompt, userPrompt } = buildStage2PromptMessages(...);
  const stage2Response = await callOpenRouterAPI(systemPrompt, userPrompt);
  analysisResult = JSON.parse(stage2Response);
} catch (stage2Error) {
  console.warn(`Stage 2 primary (claude-opus-4.5) failed, trying fallback (gemini-2.5-pro)...`);
  stage2Model = "gemini-2.5-pro (fallback)";
  try {
    const stage2Response = await callGeminiAPI(stage2Prompt, googleApiKey, true);
    analysisResult = JSON.parse(stage2Response);
  } catch (fallbackError) {
    // Use minimal fallback result
    analysisResult = { ai_rating: "Warm", rating_confidence: "Low", ... };
    stage2Model = "rule-based fallback";
  }
}
```

#### Stage 3 Execution:
```typescript
let stage3Model = "gemini-3-flash-preview";
try {
  const stage3Response = await callGemini3FlashAPI(stage3Prompt, googleApiKey, true);
  stage3Result = JSON.parse(stage3Response);
} catch (stage3Error) {
  console.warn(`Stage 3 primary (gemini-3-flash) failed, trying fallback (gemini-2.5-flash)...`);
  stage3Model = "gemini-2.5-flash (fallback)";
  try {
    const stage3Response = await callGemini25FlashAPI(stage3Prompt, googleApiKey, true);
    stage3Result = JSON.parse(stage3Response);
  } catch (fallbackError) {
    // Keep Stage 2 talking_points as fallback
    stage3Model = "skipped (using Stage 2 output)";
  }
}
```

---

### 5. Model Tracking in Results

Add model metadata to track which model processed each stage:

```typescript
const result = {
  leadId: lead.id,
  rating: analysisResult.ai_rating,
  insights: analysisResult.summary,
  fullAnalysis: analysisResult,
  parseSuccess,
  fromCache: false,
  models_used: {
    stage1: stage1Model,
    stage2: stage2Model,
    stage3: stage3Model
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-leads/index.ts` | Add `callGemini3FlashAPI()`, `callGemini25FlashAPI()`, `callOpenRouterAPI()`. Update Stage 1, 2, 3 calls with fallback logic. Add model tracking. Split Stage 2 prompt for OpenAI format. |
| `.lovable/plan.md` | Update architecture documentation |

---

## API Keys Required

| Secret | Status | Used For |
|--------|--------|----------|
| `GOOGLE_AI_API_KEY` | Already configured | Gemini 3 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro |
| `OPENROUTER_API_KEY` | Already configured | Claude Opus 4.5 |

---

## Rate Limiting & Cost

### Expected Latency:
| Stage | Model | Expected Latency |
|-------|-------|-----------------|
| Stage 1 | Gemini 3 Flash | ~1-2s |
| Stage 2 | Claude Opus 4.5 | ~5-8s |
| Stage 3 | Gemini 3 Flash | ~1-2s |
| **Total** | | ~7-12s per lead |

### Cost Profile:
- **Stage 1 & 3**: Google pricing for Gemini 3 Flash
- **Stage 2**: OpenRouter pricing for Claude Opus 4.5 (~$5/M input, ~$25/M output tokens)
- **Fallbacks**: Google pricing for Gemini 2.5 Flash / Pro

---

## Validation Checklist

After implementation, verify:
1. Stage 1 returns valid extracted signals JSON using Gemini 3 Flash
2. Stage 2 returns valid PPS scores + persona using Claude Opus 4.5 via OpenRouter
3. Stage 3 returns valid NBA-ID + TP-IDs using Gemini 3 Flash
4. Fallback to Gemini 2.5 Flash works when Gemini 3 Flash fails (Stage 1 & 3)
5. Fallback to Gemini 2.5 Pro works when OpenRouter fails (Stage 2)
6. `models_used` metadata correctly tracks which models processed each stage
7. End-to-end processing completes for a sample lead

---

## Summary

This implementation uses:
- **Gemini 3 Flash Preview** (direct API) for fast Stage 1 & 3 processing
- **Claude Opus 4.5** (OpenRouter API) for superior Stage 2 reasoning
- **Gemini 2.5 Flash/Pro** (direct API) as fallbacks - no Lovable AI Gateway dependency

All API calls use direct provider endpoints with the already-configured API keys (`GOOGLE_AI_API_KEY` and `OPENROUTER_API_KEY`).
