
# Plan: Give Stage 3 Access to the Knowledge Base (Patch 1)

## Problem

`buildStage3Prompt()` in `nba-framework.ts` generates talking points and NBA recommendations but never receives tower inventory, competitor pricing, or project metadata. When it writes competitor prices or possession dates in talking points, it hallucinates from static example text in the TALKING_POINTS constant definitions.

## Changes

### File 1: `supabase/functions/analyze-leads/nba-framework.ts`

**Add `formatKBForStage3()` helper function** before `buildStage3Prompt()` (~line 2065):
- Accepts `towerInventory`, `competitorPricing`, and `projectMetadata`
- Formats tower inventory as a markdown table (Project, Tower, Typology, Carpet, Closing Price, OC Date, Unsold)
- Maps project_id to readable names (eternia, primera, estella, immensa)
- Formats competitor pricing as a markdown table (Competitor, Project, Config, Carpet, Price in Lakhs, PSF, vs Eternia)
- Includes key project facts from projectMetadata
- Ends with a CRITICAL RULE: "Use ONLY numbers from tables above, NEVER use example numbers from framework TP definitions"

**Update `buildStage3Prompt()` signature** to accept 3 new optional parameters:
- `towerInventory?: any[]`
- `competitorPricing?: any[]`
- `projectMetadata?: any`

**Inject KB section into prompt** between `safetySection` and `frameworkSection` in the return template.

### File 2: `supabase/functions/analyze-leads/index.ts`

**Update both call sites** (primary ~line 2954 and fallback ~line 2993) to pass the 3 new arguments:
```
buildStage3Prompt(analysisResult, extractedSignals, visitComments, towerInventory || [], competitorPricing || [], projectMetadata)
```

## No other files changed

Types and UI remain untouched. The function signature change is backward-compatible (new params are optional).
