

# Plan: Upgrade Stage 1 to Gemini 3 Pro Preview with Google Search Grounding and Financial Capability Assessment

## Overview

Upgrade Stage 1 from Gemini 3 Flash to Gemini 3 Pro Preview, add a Google Search grounding pre-step for employer/company verification, and introduce a new `financial_capability_assessment` composite field that combines CRM + MQL data into an intent signal with budget stretch probability (20-30%). This assessment is passed as context to all downstream stages (PPS scoring, TP, NBA, CS).

## Problem

1. Stage 1 currently uses Gemini 3 Flash -- a lighter model that may miss nuanced extraction
2. No web grounding exists to verify employer names, company sizes, or industry context
3. No composite "financial capability" signal exists that combines CRM budget, MQL income/credit, and infers budget stretch potential
4. Downstream stages lack this combined signal for more accurate scoring and recommendations

## Architecture

Stage 1 becomes a two-step process:

```text
Step 1A: Google Search Grounding (Gemini 3 Pro Preview)
  Input: Employer name, designation, company name from CRM/MQL
  Output: Verified employer details, company size, industry, estimated compensation band
  Mode: Text (no JSON mode -- grounding incompatible with JSON mode)

Step 1B: Structured Extraction (Gemini 3 Pro Preview)
  Input: Raw CRM data + MQL data + Step 1A grounding context
  Output: extractedSignals JSON (existing schema + new financial_capability_assessment)
  Mode: JSON mode (structured output)
```

## Changes

### 1. New API Function: `callGemini3ProWithGrounding` (`index.ts`)

Create a new function for Gemini 3 Pro Preview with Google Search grounding enabled. This uses the `generativelanguage.googleapis.com/v1beta` endpoint with `"tools": [{"google_search": {}}]`. Since grounding is incompatible with JSON response mode, this function returns raw text.

```typescript
async function callGemini3ProWithGrounding(
  prompt: string,
  googleApiKey: string,
  maxRetries: number = 2,
): Promise<{ text: string; groundingMetadata: any }> {
  // Uses gemini-3-pro-preview with tools: [{ google_search: {} }]
  // Returns text + groundingMetadata from response
  // Retry logic for 503/429
}
```

### 2. Employer Grounding Prompt (new helper in `index.ts`)

Build a short prompt that asks Gemini to verify the employer/company details using web search:

```typescript
function buildGroundingPrompt(employerName: string, designation: string, companyName: string, location: string): string {
  return `Verify the following employer/company details using web search:
  - Employer: ${employerName}
  - Designation: ${designation}
  - Company: ${companyName}
  - Location: ${location}
  
  Provide:
  1. Is this a real, verifiable company? (verified/unverified/unknown)
  2. Company size category (Large Enterprise / Mid-size / SME / Startup / Unknown)
  3. Industry sector
  4. Typical compensation range for this designation at this company (if available)
  5. Company reputation/stability signal (Established / Growing / Unknown)
  
  Be concise. If information is not available, say "Unknown".`;
}
```

### 3. New Output Field: `financial_capability_assessment` (added to Stage 1 output schema)

Add a new top-level field to the Stage 1 extraction output:

```json
"financial_capability_assessment": {
  "combined_income_signal": "Elite" | "High" | "Mid-Senior" | "Entry-Mid" | "Unknown",
  "income_sources": ["CRM stated income", "MQL verified income", "Employer-based estimate"],
  "budget_stretch_probability": "High" | "Medium" | "Low" | "Unknown",
  "budget_stretch_range_cr": { "min": number, "max": number } | null,
  "stretch_reasoning": "string (max 30 words explaining why stretch is likely/unlikely)",
  "employer_verified": boolean,
  "employer_size": "Large Enterprise" | "Mid-size" | "SME" | "Startup" | "Unknown",
  "employer_industry": "string | null",
  "combined_affordability_tier": "Comfortable" | "Stretched" | "At-Limit" | "Over-Budget" | "Unknown",
  "intent_from_capability": "High" | "Medium" | "Low",
  "grounding_used": boolean
}
```

**Budget Stretch Logic** (embedded in the prompt instructions):
- If MQL income >= 3x annual EMI of budget property AND credit_rating = "High" --> High stretch (budget * 1.25 to 1.30)
- If MQL income >= 2x AND credit_rating = "Medium" --> Medium stretch (budget * 1.20 to 1.25)
- If income < 2x OR credit_rating = "Low" OR no MQL data --> Low stretch (no stretch recommended)
- If employer is Large Enterprise/MNC with senior designation --> +1 tier uplift on stretch probability

### 4. Update Stage 1 Prompt (`buildStage1Prompt`)

- Add the grounding context as a new section: `# EMPLOYER VERIFICATION (Web-Grounded)`
- Add the `financial_capability_assessment` field to the extraction output schema
- Add extraction instructions for the new field explaining the budget stretch logic

### 5. Update Stage 1 Execution Flow (main pipeline)

Change the Stage 1 execution from single-call to two-step:

```typescript
// Step 1A: Grounding call (skip if no employer data available)
let groundingContext = "";
if (employerName || companyName) {
  try {
    const groundingResult = await callGemini3ProWithGrounding(
      buildGroundingPrompt(employerName, designation, companyName, location),
      googleApiKey
    );
    groundingContext = groundingResult.text;
  } catch (e) {
    console.warn("Grounding step failed, proceeding without");
  }
}

// Step 1B: Main extraction (Gemini 3 Pro Preview, JSON mode)
const stage1Prompt = buildStage1Prompt(leadDataJson, mqlSection, mqlAvailable, 
  crmFieldExplainer, mqlFieldExplainer, groundingContext);
const stage1Response = await callGemini3ProAPI(stage1Prompt, googleApiKey, true);
```

**Fallback chain**: Gemini 3 Pro Preview --> Gemini 3 Flash --> Gemini 2.5 Flash --> rule-based

### 6. Pass `financial_capability_assessment` to Downstream Stages

#### Stage 2 (PPS Scoring - `buildStage2Prompt`)
Add to the Stage 2 instructions:
```
## FINANCIAL CAPABILITY ASSESSMENT (from Stage 1)
Use the financial_capability_assessment from extracted signals for enhanced scoring:
- combined_affordability_tier informs Financial Capability (A) dimension
- budget_stretch_probability and budget_stretch_range_cr inform whether the lead can be 
  pitched slightly above-budget options (within 25% guardrail)
- employer_verified = true with Large Enterprise adds +2 pts to Financial Capability
- intent_from_capability directly modifies Intent & Engagement scoring
```

#### Stage 3B (TP/NBA - both `nba-framework.ts` and `nba-scenario-framework.ts`)
Add to the lead context section:
```
## Financial Capability Context
- Budget Stretch: ${budgetStretchProbability} (${budgetStretchRange})
- Affordability: ${combinedAffordabilityTier}
- Employer: ${employerVerified ? "Verified" : "Unverified"} (${employerSize})
- Intent from Capability: ${intentFromCapability}
```

Update Stage 3B functions (`buildStage3Prompt` and `buildStage3ScenarioPrompt`) to extract and pass these fields from `extractedSignals`.

#### Cross-Sell (already in `index.ts`)
Add to the lead profile section in `buildCrossSellPrompt`:
```
- Budget Stretch Probability: ${stretchProb}
- Budget Stretch Range: ${stretchRange}
- Affordability Tier: ${affordabilityTier}
```

This allows cross-sell to consider whether a lead who states 1.5 Cr budget could actually afford a 1.8 Cr option if their stretch probability is "High".

### 7. Update Evaluator Context (`evaluator.ts`)

Add `financial_capability_assessment` to the `leadContext` object in `buildEvaluatorPrompt` so the evaluator can validate that TPs/NBAs respect the combined capability signal.

## What Does NOT Change

- Stage 1 output schema remains backward-compatible (new fields are additive)
- Stage 3A classification prompts unchanged
- Evaluator rules 1-17 remain (only context injection updated)
- Database schema and UI unchanged
- Privacy rules (raw financial data never shown) remain enforced

## Risk Mitigation

- Grounding call is optional -- if it fails, Stage 1 proceeds without employer verification
- Gemini 3 Pro Preview is more expensive and slower than Flash; the grounding step adds latency. Mitigation: grounding is skipped if no employer data exists, and has a short 2-retry limit
- The fallback chain ensures Stage 1 never blocks the pipeline
- Budget stretch is advisory only -- it does not override the 25% hard guardrail, it informs whether TPs can mention slightly premium options within that guardrail

## Technical Details

- Model upgrade: `gemini-3-flash-preview` --> `gemini-3-pro-preview` for Stage 1B (main extraction)
- New API endpoint usage: `generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent` with `"tools": [{"google_search": {}}]`
- Grounding response parsing: Extract `text` from `candidates[0].content.parts[0].text` and `groundingMetadata` from `candidates[0].groundingMetadata`
- JSON mode used only in Step 1B (not 1A), avoiding the grounding+JSON incompatibility

