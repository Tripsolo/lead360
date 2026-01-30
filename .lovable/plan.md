# NBA & Talking Point Guardrails - IMPLEMENTED ✅

## Summary

Implemented guardrails to fix the issues discovered during the 5-lead audit:

1. ✅ **Proxy buyer detection** - Added explicit keyword patterns in Stage 1 extraction
2. ✅ **Persona validation** - Added Stage 2 guardrails to prevent investor misclassification for family buyers  
3. ✅ **Investor TP enforcement** - Added Stage 3 rules requiring TP-INV-* for investor personas
4. ✅ **Ecosystem concern granularity** - Expanded location keywords and sub-categories
5. ✅ **Proxy buyer safety rule** - Added NBA-COM-010 trigger in checkSafetyConditions()

---

## Changes Made

### Stage 1: Signal Extraction (`index.ts`)

**Line 119-139:** Added explicit proxy detection patterns:
- Keywords: "on behalf of", "for my brother/sister", "visiting for someone else", etc.
- New output fields: `proxy_relationship`, `actual_decision_maker`, `decision_maker_availability`

**Line 275-285:** Enhanced concerns_extracted schema:
- Added `sub_topic` field: "Connectivity", "School Proximity", "Ecosystem Rebuild", "Social Circle", etc.
- Added `customer_words` field for direct quotes

### Stage 2: Persona & Scoring (`index.ts`)

**Line 828-860:** Added PERSONA VALIDATION GUARDRAILS:
1. **Family Override**: If persona = "Pragmatic Investor" BUT children_count > 0 or family-centric motivation → Override to "Lifestyle Connoisseur" or "Aspirant Upgrader"
2. **Proxy Buyer Override**: If proxy detected, classify based on actual decision maker or default to "Aspirant Upgrader"
3. **Core Motivation Alignment**: Investment keywords → Investor personas only; Family keywords → Family personas only
4. **Conflicting Signal Logging**: Output persona_confidence = "Low" with conflict reason

### Stage 3: NBA & TP Selection (`nba-framework.ts`)

**Line 1105-1116:** Expanded OBJECTION_DETECTION_KEYWORDS for "Location & Ecosystem":
- Added school/education keywords: "school", "podar", "vasant vihar", "dps", "icse", "cbse"
- Added ecosystem rebuild keywords: "rebuild", "start over", "social circle", "know nobody"
- Added infrastructure keywords: "hospital", "market", "traffic"

**Line 1510-1525:** Enhanced mapToMatrixObjection() for Location & Ecosystem:
- School proximity concerns → "Connectivity Concerns" (triggers TP-LOC-001)
- Ecosystem rebuild concerns → "Connectivity Concerns" (triggers TP-LOC-002)
- Premium location comparison → "Competitor Location Better"

**Line 1532-1546:** Enhanced Investment objection refinement:
- Question patterns → "Just Started Exploring" (educate)
- ROI concern patterns → "Budget Gap (<15%)" (investor-specific TPs)
- Market timing concerns → "Timeline Concern (General)"

**Line 1597-1635:** Added proxy buyer safety rule in checkSafetyConditions():
- If `decision_makers_present === "Proxy"` → Override to NBA-COM-010
- Includes proxy_relationship and actual_decision_maker in rule message

**Line 1814-1879:** Added PERSONA-SPECIFIC TP SELECTION RULES:
- Rule 5: Investor personas MUST get TP-INV-* (especially TP-INV-006)
- Rule 6: Family personas MUST get lifestyle/family-centric TPs
- Rule 7: Proxy buyers MUST get TP-DEC-003 (decision-maker urgency)

---

## Testing Checklist

After re-analyzing the 5 audited leads, verify:

| Lead ID | Issue | Expected After Fix |
|---------|-------|-------------------|
| 006fv000006ysDP | Proxy buyer missed | NBA-COM-010 + TP-DEC-003 |
| 006fv0000075ROZ | Investor misclassification | "Lifestyle Connoisseur" or "Aspirant Upgrader" |
| Investor leads | Generic TPs | TP-INV-006 (rental yield & ROI) |
| School concern leads | Generic "Location" | Sub-topic: "School Proximity" |

---

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `supabase/functions/analyze-leads/index.ts` | 119-139, 256-285, 826-860 | Proxy detection, concerns schema, persona validation |
| `supabase/functions/analyze-leads/nba-framework.ts` | 1105-1116, 1510-1546, 1597-1635, 1814-1879 | Objection keywords, mapping, safety rules, TP selection |
