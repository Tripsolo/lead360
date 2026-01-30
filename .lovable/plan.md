
# Fix TP-INV-006 Category & Enhance mapToMatrixObjection() Logic

## Overview

This plan addresses two discrepancies between the Excel framework and the current implementation:
1. **TP-INV-006 miscategorization**: Currently under "Inventory & Product" but should be "Investment"
2. **Incomplete mapToMatrixObjection()**: Missing granular detection for 14 matrix sub-categories

---

## Issue 1: TP-INV-006 Category Fix

### Current State (Incorrect)
```typescript
"TP-INV-006": {
  tp_id: "TP-INV-006",
  category: "Inventory & Product",  // ❌ WRONG
  sub_category: "ROI Focus",
  ...
}
```

### Correct State (Per Excel Row 34)
```typescript
"TP-INV-006": {
  tp_id: "TP-INV-006",
  category: "Investment",  // ✅ CORRECT
  sub_category: "ROI Focus",
  ...
}
```

### Change
Update line 276 in `nba-framework.ts` to change `category: "Inventory & Product"` to `category: "Investment"`.

---

## Issue 2: Enhanced mapToMatrixObjection() Logic

### Current Problem
The function maps broad objection categories to simplified sub-categories:
- "Investment" → "Just Started Exploring" (incorrect)
- "Inventory & Product" → "Rooms Feel Small" (too simplistic)
- No detection for: Delay Fear, View/Privacy, Deck requirement, etc.

### Enhanced Detection Logic

The matrix has **14 specific objection sub-categories**. We need to detect these from:
1. **Visit comments keywords** (primary source)
2. **Extracted signals** (secondary source)
3. **CRM data patterns** (tertiary source)

### New Keyword Detection Table

| Matrix Sub-Category | Detection Keywords | Signal Checks |
|---------------------|-------------------|---------------|
| Budget Gap (<15%) | budget, expensive, price | budgetGap < 15 |
| Budget Gap (>15%) | budget, expensive, price | budgetGap > 15 |
| SOP Required | sell, sop, current property, selling | non_booking_reason contains "sell" |
| Loan Eligibility Issue | loan, eligibility, bank, rejected | loan_concern in signals |
| RTMI Need (Urgent 75+) | immediate, urgent, rtmi, parents | age > 75 + immediate timeline |
| Timeline Concern (General) | possession, delay, timeline, 2027, 2028 | possession_urgency signal |
| Delay Fear (Immensa History) | immensa, delay history, late, previous | immensa mentioned |
| Rooms Feel Small | small, compact, cramped, size | room_size_concern |
| Vastu Non-Compliance | vastu, direction, northeast, facing | vastu_concern signal |
| View/Privacy Concern | view, privacy, building front, facing | view_preference signal |
| Price Lower at Competitor | competitor cheaper, lodha, dosti, runwal | competitors_mentioned |
| Competitor Location Better | location better, powai, hiranandani | location comparison keywords |
| Multiple Decision Makers | family, parents, spouse, discuss, bring | decision_maker_concern |
| Just Started Exploring | just started, exploring, first visit | engagement_level = "Exploring" |

### Enhanced Function Logic

```text
function mapToMatrixObjection(objectionCategory, extractedSignals, visitComments):
  
  // Normalize inputs
  lowerComments = (visitComments || "").toLowerCase()
  lowerNonBooking = (extractedSignals?.engagement_signals?.non_booking_reason || "").toLowerCase()
  
  // Economic Fit - Most granular detection
  if objectionCategory == "Economic Fit":
    if containsAny(lowerComments + lowerNonBooking, ["sell property", "sop", "current flat sale", "selling"]):
      return "SOP Required"
    
    if containsAny(lowerComments + lowerNonBooking, ["loan", "eligibility", "bank reject", "cibil"]):
      return "Loan Eligibility Issue"
    
    budgetGap = extractedSignals?.financial_signals?.budget_gap_percent
    if budgetGap != null:
      return budgetGap > 15 ? "Budget Gap (>15%)" : "Budget Gap (<15%)"
    
    return "Budget Gap (<15%)"  // Default for Economic Fit
  
  // Possession Timeline - Check for specific patterns
  if objectionCategory == "Possession Timeline":
    age = extractedSignals?.demographics?.age
    if age > 75:
      return "RTMI Need (Urgent 75+)"
    
    if containsAny(lowerComments, ["immensa", "delay history", "previous delay"]):
      return "Delay Fear (Immensa History)"
    
    return "Timeline Concern (General)"
  
  // Inventory & Product - Multiple sub-categories
  if objectionCategory == "Inventory & Product":
    if containsAny(lowerComments, ["vastu", "direction", "northeast", "facing north", "facing east"]):
      return "Vastu Non-Compliance"
    
    if containsAny(lowerComments, ["view", "privacy", "building in front", "facing building"]):
      return "View/Privacy Concern"
    
    if containsAny(lowerComments, ["small", "compact", "cramped", "room size", "bedroom small"]):
      return "Rooms Feel Small"
    
    return "Rooms Feel Small"  // Default for Inventory & Product
  
  // Location & Ecosystem
  if objectionCategory == "Location & Ecosystem":
    if containsAny(lowerComments, ["hiranandani", "powai", "premium area", "better location"]):
      return "Competitor Location Better"
    
    return "Competitor Location Better"  // Default for Location
  
  // Competition
  if objectionCategory == "Competition":
    if containsAny(lowerComments, ["cheaper", "lower price", "less expensive"]):
      return "Price Lower at Competitor"
    
    return "Price Lower at Competitor"  // Default for Competition
  
  // Investment - New proper mapping
  if objectionCategory == "Investment":
    if containsAny(lowerComments, ["roi", "rental", "yield", "appreciation", "investment"]):
      return "Just Started Exploring"  // Investors typically exploring options
    
    return "Just Started Exploring"
  
  // Decision Process - Multiple sub-categories
  if objectionCategory == "Decision Process":
    if containsAny(lowerComments, ["exploring", "just started", "first visit", "not sure"]):
      return "Just Started Exploring"
    
    if containsAny(lowerComments, ["family", "parents", "spouse", "discuss", "bring", "decision maker"]):
      return "Multiple Decision Makers"
    
    return "Multiple Decision Makers"  // Default for Decision Process
  
  // Special Scenarios - Map to appropriate
  if objectionCategory == "Special Scenarios":
    return "Just Started Exploring"  // Catch-all
  
  return "Just Started Exploring"  // Fallback
```

---

## Technical Implementation

### File Changes

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/analyze-leads/nba-framework.ts` | 276 | Fix TP-INV-006 category |
| `supabase/functions/analyze-leads/nba-framework.ts` | 1419-1461 | Rewrite mapToMatrixObjection() |

### New Helper Function

Add a `containsAny()` helper for keyword matching:

```typescript
function containsAny(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}
```

### Updated Function Signature

The `mapToMatrixObjection()` function will need an additional parameter:

```typescript
// Before
export function mapToMatrixObjection(
  objectionCategory: ObjectionCategory,
  extractedSignals: any
): string

// After
export function mapToMatrixObjection(
  objectionCategory: ObjectionCategory,
  extractedSignals: any,
  visitComments: string = ""  // NEW: For keyword detection
): string
```

### Update Call Sites

The function is called in `lookupMatrixEntry()` and `buildStage3Prompt()`. Both need to pass `visitComments`:

```typescript
// In lookupMatrixEntry() - add visitComments parameter
export function lookupMatrixEntry(
  persona: string,
  objectionCategory: ObjectionCategory,
  extractedSignals: any,
  visitComments: string = ""  // NEW
): MatrixEntry | null {
  const normalizedPersona = normalizePersona(persona);
  const matrixObjection = mapToMatrixObjection(objectionCategory, extractedSignals, visitComments);
  ...
}
```

---

## Validation

After implementation, the following test cases should pass:

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| ROI question from investor | objection="Investment", comments="What's the rental yield?" | "Just Started Exploring" |
| SOP mentioned | objection="Economic Fit", comments="Need to sell flat first" | "SOP Required" |
| Loan concern | objection="Economic Fit", comments="Bank rejected loan" | "Loan Eligibility Issue" |
| 75+ age with urgency | objection="Possession Timeline", age=78 | "RTMI Need (Urgent 75+)" |
| Immensa delay fear | objection="Possession Timeline", comments="Immensa was delayed" | "Delay Fear (Immensa History)" |
| Vastu concern | objection="Inventory & Product", comments="Kitchen is not vastu" | "Vastu Non-Compliance" |
| View concern | objection="Inventory & Product", comments="building in front of window" | "View/Privacy Concern" |
| Competitor cheaper | objection="Competition", comments="Lodha is cheaper" | "Price Lower at Competitor" |

---

## Summary

1. **TP-INV-006 Fix**: Single-line change from "Inventory & Product" to "Investment"
2. **Enhanced Detection**: Full rewrite of `mapToMatrixObjection()` with keyword-based granular detection
3. **New Helper**: `containsAny()` function for flexible keyword matching
4. **Updated Signatures**: `lookupMatrixEntry()` and call sites updated to pass `visitComments`

This ensures the Stage 3 prompt selects the correct matrix row based on actual CRM data patterns, not just broad category defaults.
