

# Revised Plan: Framework-Aligned Updates

## Analysis Summary

After examining the existing framework structure, I've identified:

**Already Covered (no new TPs needed):**
- "Not sure on exact area" → TP-DEC-002 exists
- "Ecosystem rebuild" → TP-LOC-002 exists  
- "Just Started Exploring" → Matrix entry exists (NBA-FUP-001)

**Medium Gap Fixes (update existing TPs):**
1. TP-ECO-006 - Add "don't say flat no" guidance
2. TP-ECO-007 - Add competitor comparison requirement

**Truly Missing (no overlap - create new):**
1. TP-DEC-006 - Budget discovery (scouting leads who don't know their budget)
2. TP-DEC-007 - Family location disagreement mediation

---

## Part 1: Update Existing TPs (Medium Gaps)

### TP-ECO-006 Update

**Current:**
```typescript
talking_point: "Explain business economics transparently, then offer structured alternatives"
```

**Updated:**
```typescript
talking_point: "Don't refuse outright. Discuss cash flow needs first, then suggest bullet plan or custom schedule post management approval"
```

**Updated logical_argument:**
```typescript
"Subvention costs us 2-3% of deal value. We CAN'T offer it free - but we CAN structure: bullet plan aligned to your bonus, or 20:80 with minimal loading. Don't lose this home over payment structure"
```

---

### TP-ECO-007 Update

**Current:**
```typescript
talking_point: "Suggest floor/unit adjustment to absorb deviation cost. DO THIS FACE TO FACE..."
```

**Updated:**
```typescript
talking_point: "Suggest lower floor/unit to cover deviation. DO FACE TO FACE with pre-approved strategy. Show what competition offers at similar deviations"
```

**Updated logical_argument:**
```typescript
"2-floor lower unit saves Rs 4-6L = covers CLP deviation. Compare: [Competitor] with similar deviation charges Rs [X] more. Decision: This unit at [price] vs losing to appreciation delay"
```

---

## Part 2: Create New TPs (Zero Overlap)

### TP-DEC-006: Budget Discovery

**Why needed:** TP-DEC-002 helps leads who don't know their **area** requirement. This covers leads who don't know their **budget** (just started scouting, no financial clarity).

```typescript
"TP-DEC-006": {
  tp_id: "TP-DEC-006",
  category: "Decision Process",
  sub_category: "Budget Discovery",
  objection_scenario: "Not sure of budget - just started scouting",
  talking_point: "Work backwards: family size → room need → self-use vs investment → cash flow → budget range",
  key_data_points: "Family size, Purchase reason, Income range, Existing liabilities, Expected inflows",
  emotional_hook: "Let me help you figure this out - home buying starts with your family's needs, not spreadsheets",
  logical_argument: "Step 1: Family size = room count. Step 2: Self-use vs investment = location priority. Step 3: Income - liabilities = EMI capacity. Result: Clear budget range"
}
```

---

### TP-DEC-007: Family Location Disagreement

**Why needed:** TP-LOC-002 addresses ecosystem concerns generically. This covers when **family members disagree** on location (spouse wants closer to work vs. established area).

```typescript
"TP-DEC-007": {
  tp_id: "TP-DEC-007",
  category: "Decision Process",
  sub_category: "Family Alignment",
  objection_scenario: "Family disagrees on location - one wants closer to work, other wants established area",
  talking_point: "Acknowledge both. Township addresses 'established area' (schools, hospitals, retail). Metro addresses 'closer to work'. Schedule joint visit",
  key_data_points: "Family member preferences, Current commute times, Township infrastructure list, Metro Line 4 timeline",
  emotional_hook: "Family decisions are hard - let me show how this works for everyone, not just one person",
  logical_argument: "Spouse A wants established: Township has school, hospital, retail within walking distance. Spouse B wants commute: Metro Line 4 (2027) = 35 min to BKC. Both get what they want"
}
```

---

## Part 3: Create New NBAs (Zero Overlap)

### NBA-COM-014: Budget Discovery Consultation

```typescript
"NBA-COM-014": {
  nba_id: "NBA-COM-014",
  trigger_condition: "IF status = 'Just started scouting' AND budget_unclear = True",
  data_points_required: "Family size, Purchase reason, Income range (if available)",
  persona_filter: "All first-time buyers",
  objection_category: "Decision Process",
  action_category: "COMMUNICATION",
  specific_action: "Conduct discovery call: family size → room needs → budget crystallization. Position as guidance, not sales",
  escalation_trigger: "Client refuses to share details",
  fallback_action: "Provide budget range bands, let client self-identify",
  linked_talking_points: ["TP-DEC-006"]
}
```

---

### NBA-COM-015: Family Alignment Visit

```typescript
"NBA-COM-015": {
  nba_id: "NBA-COM-015",
  trigger_condition: "IF family_disagreement_detected = True AND objection_category = 'Location'",
  data_points_required: "Family member preferences, Conflicting requirements, Workplace locations",
  persona_filter: "All with joint decision makers",
  objection_category: "Decision Process",
  action_category: "COMMUNICATION",
  specific_action: "Schedule joint family visit. Present township as solution for both parties' needs. Address each concern separately",
  escalation_trigger: "One party refuses to visit",
  fallback_action: "Send video walkthrough addressing each person's specific concerns",
  linked_talking_points: ["TP-DEC-007", "TP-LOC-002"]
}
```

---

## Part 4: Keyword & Matrix Updates

### New Keywords (Decision Process)

```typescript
// Budget discovery
"just started", "scouting", "not sure budget", "don't know budget", "figuring out",

// Family conflict
"wife wants", "husband wants", "spouse disagrees", "parents want different", "family conflict"
```

### Matrix Entries (All Personas)

Add two new objection mappings:

```typescript
"Budget Not Clear (Scouting)": { 
  nba_id: "NBA-COM-014", 
  tp_ids: ["TP-DEC-006"], 
  action_summary: "Discovery consultation" 
},
"Family Location Disagreement": { 
  nba_id: "NBA-COM-015", 
  tp_ids: ["TP-DEC-007", "TP-LOC-002"], 
  action_summary: "Joint family visit" 
}
```

---

## Files to Modify

| File | Section | Change |
|------|---------|--------|
| `nba-framework.ts` | TALKING_POINTS (line ~130) | Update TP-ECO-006, TP-ECO-007 |
| `nba-framework.ts` | TALKING_POINTS (after line 559) | Add TP-DEC-006, TP-DEC-007 |
| `nba-framework.ts` | NBA_RULES (after line 1213) | Add NBA-COM-014, NBA-COM-015 |
| `nba-framework.ts` | OBJECTION_DETECTION_KEYWORDS (line ~1341) | Add new keywords |
| `nba-framework.ts` | PERSONA_OBJECTION_MATRIX (lines 1358+) | Add 2 new entries per persona |

---

## Format Compliance Checklist

| Requirement | TP-DEC-006 | TP-DEC-007 | TP-ECO-006 | TP-ECO-007 |
|------------|-----------|-----------|-----------|-----------|
| Talking point is 1-2 lines | Yes | Yes | Yes | Yes |
| No stitched multi-recommendations | Yes | Yes | Yes | Yes |
| Follows existing structure | Yes | Yes | Yes | Yes |

| Requirement | NBA-COM-014 | NBA-COM-015 |
|------------|-------------|-------------|
| Action-oriented (not descriptive) | Yes | Yes |
| Follows existing structure | Yes | Yes |
| Has clear trigger condition | Yes | Yes |

