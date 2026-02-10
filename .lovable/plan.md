

# Plan: Add 4 New Evaluator Rules (Rules 12-15) to Prevent Identified Issues

## New Rules to Add

### Rule 12: Possession Date Cross-Check (addresses Issue #1)
Every mention of a possession date or OC date in talking points, cross-sell recommendations, or NBA must be validated against `tower_inventory.oc_date` for the specific tower referenced. If a talking point says "Tower H possession by April 2026" but KB shows Oct 2026, the evaluator must correct the date. If no specific tower is named, the evaluator must use the earliest/latest OC date range from the project's inventory.

### Rule 13: Typology Availability Validation (addresses Issue #2)
When a talking point or cross-sell recommendation references a specific project + config combination (e.g., "Immensa 2BHK"), the evaluator must verify that this typology exists in `tower_inventory` for that project. If no matching rows exist (e.g., Immensa has no 2BHK inventory), the talking point must be corrected to reference only available typologies, or removed entirely if no valid alternative exists.

### Rule 14: Sister Project Pricing Accuracy (addresses Issue #3)
When talking points or cross-sell recommendations cite a PSF (price per square foot) or price range for a sister project (Primera, Estella, Immensa), the evaluator must cross-check against `tower_inventory.closing_min_cr`, `closing_max_cr`, `carpet_sqft_min`, and `carpet_sqft_max` to compute the actual PSF range. If the cited PSF deviates by more than 10% from the KB-derived PSF, correct it with the actual number. If no inventory data exists for the project, use `sister_projects.metadata` pricing as fallback.

### Rule 15: Generic NBA Override for Actionable Leads (addresses Issue #4)
If the NBA is a generic follow-up (NBA-FUP-001 or any NBA where `action_type = "FOLLOW-UP"` and the action text contains generic phrases like "schedule follow-up", "periodic check-in", "touch base"), AND the lead has at least one specific objection detected (from `objections_detected`), AND the lead rating is "Warm" or "Hot", THEN the evaluator must flag this as an error and suggest a more specific NBA aligned to the primary objection category. For example: if primary objection is "Price", suggest NBA-OFF-001 (payment plan offer); if "Competition", suggest NBA-CON-002 (comparative collateral).

## File Changes

### `evaluator.ts` -- `buildEvaluatorPrompt` function

Insert Rules 12-15 after Rule 11 (Budget Standardization) at approximately line 308, before the knowledge base section begins at line 310.

```
### Rule 12: Possession Date Cross-Check (CRITICAL)
When ANY output field mentions a possession date, OC date, or move-in timeline for a specific tower:
1. Look up that tower in tower_inventory and find its oc_date
2. If the stated date does NOT match the KB oc_date → CORRECT with the actual date
3. If no specific tower is named, use the range of OC dates for that project
4. Add to corrections_made with reason: "Possession date corrected per KB tower_inventory"
Example: TP says "Tower H ready by April 2026" but KB shows oc_date = "2026-10-01" → CORRECT to "Oct 2026"

### Rule 13: Typology Availability Validation (CRITICAL)
When ANY output references a project + config combination (e.g., "Immensa 2BHK", "Primera 3BHK"):
1. Check tower_inventory for rows matching that project_id AND typology
2. If ZERO rows exist for that combination → ERROR: typology does not exist
3. CORRECT: Replace with an available typology from that project, or remove the reference
4. Add to corrections_made with reason: "Typology does not exist in KB inventory"
Example: TP mentions "Immensa 2BHK rentals" but inventory shows Immensa only has 4BHK → CORRECT or REMOVE

### Rule 14: Sister Project PSF Accuracy (CRITICAL)
When ANY output cites a PSF (price per sqft) for Eternia or a sister project:
1. Compute actual PSF from tower_inventory: PSF = (closing_min_cr * 10000000) / carpet_sqft_max (for min PSF) and (closing_max_cr * 10000000) / carpet_sqft_min (for max PSF)
2. If the cited PSF deviates by more than 10% from the KB-derived range → CORRECT with actual PSF
3. If no inventory data exists, use sister_projects.metadata pricing as fallback
4. Add to corrections_made with reason: "PSF corrected per KB tower_inventory calculation"
Example: TP says "Primera at ₹20K PSF" but KB-derived PSF is ₹14,500-15,500 → CORRECT to actual range

### Rule 15: Generic NBA Override for Actionable Leads
If ALL of the following are true:
1. NBA action_type = "FOLLOW-UP" AND action text contains generic phrases ("schedule follow-up", "periodic check-in", "touch base", "keep in touch", "regular updates")
2. Lead has at least 1 objection in objections_detected
3. Lead persona is NOT "Passive Explorer" or "Window Shopper"
THEN → ERROR: Generic NBA inappropriate for lead with specific objections
CORRECT: Suggest a specific NBA aligned to the primary objection:
- Price/Economic Fit → NBA-OFF-001 (payment plan / offer)
- Competition → NBA-CON-002 (comparative collateral)
- Possession → NBA-CON-003 (construction progress update)
- Config/Amenities → NBA-CON-001 (site visit / sample flat)
- Trust → NBA-COM-005 (senior management connect)
Add to corrections_made with reason: "Generic follow-up replaced with objection-specific NBA"
```

## What Does NOT Change

- Rules 1-11 remain untouched
- Knowledge base formatters unchanged
- API call logic, response parsing unchanged
- No database or UI changes
- Stage 1, 2, 3 prompts unchanged

