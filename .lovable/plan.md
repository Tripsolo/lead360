
# Add Guardrails for NBA & Talking Point Accuracy

## Summary

This plan addresses the issues discovered during the audit of 5 leads, where we found:
1. **Proxy buyer detection failures** - "brother visiting for sister" pattern not triggering NBA-COM-010
2. **Persona misclassification** - Investor label applied to family buyers; core motivation mismatch
3. **Generic talking point fallbacks** - Investors receiving size/budget TPs instead of ROI-focused TP-INV-006
4. **Objection alignment gaps** - Ecosystem concerns mapped to generic "Location" instead of infrastructure-specific handling

The fixes will be applied across Stage 1 (signal extraction), Stage 2 (persona/scoring), and Stage 3 (NBA/TP selection).

---

## Issue 1: Proxy Buyer Detection (Stage 1)

### Problem
Lead `006fv000006ysDP` had notes stating "brother visited on behalf of sister" but:
- `decision_makers_present` was not set to "Proxy"
- NBA-COM-010 (proxy handling) was never triggered
- TP-DEC-003 (decision-maker visit urgency) was not selected

### Root Cause
Stage 1 extraction prompt (line ~122) mentions "Proxy" as an option for `decision_makers_present` but lacks explicit keyword detection rules.

### Fix
Update Stage 1 extraction instructions to add explicit proxy detection patterns.

**File:** `supabase/functions/analyze-leads/index.ts`  
**Location:** Within `buildStage1Prompt()`, after line ~122 where `decision_makers_present` is defined

**Add new extraction rule:**
```
### Proxy Buyer Detection (CRITICAL):
11. decision_makers_present:
    - "All": All decision makers were present during visit
    - "Partial": Primary buyer present but spouse/parent/child needs to be consulted
    - "Proxy": Set to "Proxy" if ANY of these patterns detected:
      * "on behalf of" / "for my [brother/sister/parent/friend]"
      * "my [brother/sister/son/daughter] wants" / "[sibling] is looking"
      * "visiting for someone else" / "checking for family member"
      * "will share with [family member] who will decide"
      * CRM field "Who will take decision" = different person from visitor
    - When Proxy is detected, also extract:
      * proxy_relationship: Who is the visitor (e.g., "brother", "friend")
      * actual_decision_maker: Who will make the final decision
      * decision_maker_availability: If mentioned (e.g., "abroad", "can visit next month")
```

**Also add to output schema (line ~262):**
```json
"decision_makers_present": "All" | "Partial" | "Proxy" | null,
"proxy_relationship": "string | null",
"actual_decision_maker": "string | null",
"decision_maker_availability": "string | null",
```

---

## Issue 2: Persona Misclassification (Stage 2)

### Problem
Lead `006fv0000075ROZ` was labeled "Investor" despite:
- CRM notes showing "family with school-going children"
- Location concerns about school proximity
- Core motivation clearly being lifestyle/family upgrade

### Root Cause
Stage 2 persona detection prioritizes `investor_signal` from MQL data (presence of multiple home loans) over behavioral signals in visit notes. The persona rules don't sufficiently weight CRM visit context.

### Fix
Add persona validation guardrails that cross-check detected persona against core motivation and family signals.

**File:** `supabase/functions/analyze-leads/index.ts`  
**Location:** Stage 2 prompt (around line 828-830)

**Add persona validation section:**
```
## PERSONA VALIDATION GUARDRAILS (CRITICAL)

After initial persona detection, VALIDATE against these override rules:

1. **Family Override for Investor Label:**
   If persona = "Pragmatic Investor" BUT any of these signals present:
   - children_count > 0 OR children_ages is not empty
   - core_motivation contains "family", "children", "school", "kids", "upgrade"
   - concerns_extracted mentions "school", "children", "family"
   → OVERRIDE to "Lifestyle Connoisseur" or "Aspirant Upgrader" based on income_tier

2. **Proxy Buyer Override:**
   If decision_makers_present = "Proxy":
   - Persona classification should be based on the ACTUAL decision maker's profile (if known)
   - If unknown, default to "Aspirant Upgrader" and flag for discovery

3. **Core Motivation Alignment Check:**
   The detected persona MUST align with core_motivation:
   - "investment", "rental", "ROI", "appreciation" → Investor personas only
   - "family", "children", "upgrade", "space" → Family/Lifestyle personas only
   - "retirement", "settlement", "parents" → Settlement Seeker
   - "first home", "newly married" → First-Time Buyer

4. **Conflicting Signal Log:**
   If persona signals conflict, output:
   - persona_confidence: "Low"
   - persona_conflict_reason: "Investor signal from MQL but family-centric motivation in CRM"
```

---

## Issue 3: Generic Talking Point Fallbacks (Stage 3)

### Problem
Investors were receiving generic talking points like TP-ECO-007 (floor adjustment) instead of ROI-focused TP-INV-006 (rental yield and appreciation).

### Root Cause
The `detectObjectionCategories()` function in nba-framework.ts (line ~1083) maps objections broadly. When "Investment" category is detected, it defaults to "Just Started Exploring" which pulls generic TPs.

### Fix 1: Add Investment-specific objection refinement

**File:** `supabase/functions/analyze-leads/nba-framework.ts`  
**Location:** `mapToMatrixObjection()` function (around line 1532-1538)

**Update Investment case:**
```typescript
case "Investment":
  // Check for specific investment concerns
  if (containsAny(lowerComments, ["roi", "rental", "yield", "appreciation", "returns"])) {
    // Check if they're asking questions vs have concerns
    if (containsAny(lowerComments, ["what is", "how much", "returns?", "rental income?"])) {
      return "Just Started Exploring"; // Genuine inquiry
    }
    // If concerned about ROI/yield specifically
    return "Budget Gap (<15%)"; // Use economic matrix but with investor-specific TPs
  }
  if (containsAny(lowerComments, ["market down", "prices falling", "not right time", "wait"])) {
    return "Timeline Concern (General)";
  }
  return "Just Started Exploring";
```

### Fix 2: Add Investor-specific TP enforcement in Stage 3 prompt

**File:** `supabase/functions/analyze-leads/nba-framework.ts`  
**Location:** `buildStage3Prompt()` function (around line 1783-1818)

**Add to CRITICAL RULES section:**
```
5. **Investor Persona TP Selection:**
   If persona = "Pragmatic Investor" or "First-Time Investor":
   - MUST include at least one talking point from Investment category (TP-INV-*)
   - Prioritize TP-INV-006 (rental yield and ROI) over generic Economic Fit TPs
   - Never use family-centric arguments for investors
   
6. **Family Persona TP Selection:**
   If persona has children_count > 0 or family_stage indicates children:
   - Prioritize lifestyle and family-centric talking points
   - Include school proximity, safety, community gentry arguments
   - Never use pure ROI/investment language
```

---

## Issue 4: Ecosystem Concern Granularity (Stage 1 & 3)

### Problem
Infrastructure/ecosystem concerns like "schools are far", "need to rebuild social circle" were simplified to generic "Location" objections, losing actionable detail.

### Root Cause
- Stage 1 `concerns_extracted` captures the detail but uses broad category "Location"
- Stage 3 objection detection in `detectObjectionCategories()` doesn't differentiate ecosystem sub-types

### Fix 1: Add Ecosystem sub-categories to Stage 1

**File:** `supabase/functions/analyze-leads/index.ts`  
**Location:** Stage 1 output schema, concerns_extracted section (around line 275-277)

**Update concerns structure:**
```json
"concerns_extracted": [
  { 
    "topic": "Price" | "Location" | "Possession" | "Config" | "Amenities" | "Trust" | "Others", 
    "sub_topic": "Connectivity" | "School Proximity" | "Ecosystem Rebuild" | "Social Circle" | "Infrastructure" | null,
    "detail": "string",
    "customer_words": "string | null"  // Direct quote if available
  }
],
```

### Fix 2: Update objection keyword detection

**File:** `supabase/functions/analyze-leads/nba-framework.ts`  
**Location:** `OBJECTION_KEYWORDS` constant (around line 1105-1109)

**Expand Location & Ecosystem keywords:**
```typescript
"Location & Ecosystem": [
  // Connectivity
  "location", "far", "commute", "office", "work", "travel", "connectivity",
  "metro", "highway", "distance", "traffic",
  // School/Education - NEW
  "school", "college", "education", "children school", "kids school",
  "podar", "vasant vihar", "dps", "icse", "cbse",
  // Ecosystem Rebuild - NEW
  "rebuild", "start over", "new area", "know nobody", "social circle",
  "friends", "relatives", "familiar", "ecosystem",
  // Infrastructure
  "hospital", "market", "infrastructure", "area", "vicinity"
],
```

### Fix 3: Add ecosystem objection refinement

**File:** `supabase/functions/analyze-leads/nba-framework.ts`  
**Location:** `mapToMatrixObjection()` function, Location & Ecosystem case (around line 1510-1519)

**Expand Location & Ecosystem handling:**
```typescript
case "Location & Ecosystem":
  // School proximity concerns - map to specific handling
  if (containsAny(lowerComments, ["school", "education", "children school", "kids school", "college"])) {
    return "Connectivity Concerns"; // Use TP-LOC-001 with school context
  }
  // Ecosystem rebuild concerns
  if (containsAny(lowerComments, ["rebuild", "start over", "know nobody", "social", "friends", "ecosystem", "familiar"])) {
    return "Connectivity Concerns"; // Use TP-LOC-002 (self-sustaining township)
  }
  // Premium location comparison
  if (containsAny(lowerComments, ["hiranandani", "powai", "bkc", "worli", "premium area", "better location"])) {
    return "Competitor Location Better";
  }
  // Generic connectivity
  if (containsAny(lowerComments, ["far", "commute", "travel time", "distance", "connectivity"])) {
    return "Connectivity Concerns";
  }
  return "Competitor Location Better";
```

---

## Issue 5: Missing NBA-COM-010 Trigger for Proxy Buyers

### Problem
Even when proxy signals are detected, the NBA selection doesn't automatically route to NBA-COM-010.

### Fix
Add proxy buyer check to Stage 3 safety conditions.

**File:** `supabase/functions/analyze-leads/nba-framework.ts`  
**Location:** `checkSafetyConditions()` function (around line 1597-1625)

**Add proxy buyer safety rule:**
```typescript
// Rule 3: Proxy Buyer - Always push for decision maker visit
const decisionMakersPresent = extractedSignals?.engagement_signals?.decision_makers_present;
if (decisionMakersPresent === "Proxy") {
  return {
    triggered: true,
    safetyRule: "Proxy Buyer - Must push for decision maker visit or VC",
    overrideNbaId: "NBA-COM-010",
  };
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-leads/index.ts` | Stage 1: Add proxy detection patterns, add ecosystem sub-categories, add output fields. Stage 2: Add persona validation guardrails |
| `supabase/functions/analyze-leads/nba-framework.ts` | Update objection keywords, enhance mapToMatrixObjection(), add proxy safety rule, add investor TP enforcement |

---

## Testing Recommendations

After implementing these changes:

1. **Re-analyze the 5 audited leads** to verify:
   - Lead `006fv000006ysDP` triggers NBA-COM-010 with TP-DEC-003
   - Lead `006fv0000075ROZ` gets "Lifestyle Connoisseur" instead of "Investor"
   - Investors get TP-INV-006 instead of generic floor adjustment TPs

2. **Upload a fresh batch** with diverse scenarios:
   - At least 1 proxy buyer ("visiting for sister")
   - At least 1 investor with clear investment motivation
   - At least 1 family buyer with school concerns

3. **Audit the new output** using the same methodology to verify guardrails are working

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Proxy buyer detection | Missed, no NBA-COM-010 | Safety rule triggers NBA-COM-010 + TP-DEC-003 |
| Investor persona for families | Misclassified as Investor | Validated and corrected to Lifestyle/Aspirant |
| Investor talking points | Generic TP-ECO-007 | ROI-focused TP-INV-006 |
| Ecosystem concerns | Generic "Location" | Specific sub-categories with contextual TPs |

---

## Technical Details

### Proxy Detection Keywords (Stage 1)
```
"on behalf of", "for my brother", "for my sister", "for my parent",
"my brother wants", "my sister wants", "visiting for", "checking for",
"will share with", "brother/sister is looking", "for someone else"
```

### Persona Validation Logic (Stage 2)
```
IF persona == "Pragmatic Investor" AND (
  children_count > 0 OR
  core_motivation CONTAINS ("family", "children", "school", "kids", "upgrade")
)
THEN override persona to "Lifestyle Connoisseur" OR "Aspirant Upgrader"
```

### Safety Condition Addition (Stage 3)
```typescript
if (decision_makers_present === "Proxy") {
  return { triggered: true, safetyRule: "Proxy Buyer", overrideNbaId: "NBA-COM-010" };
}
```
