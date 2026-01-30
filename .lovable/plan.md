
# Lead Data Standardization Function Implementation

## Overview

Create a centralized standardization function that merges CRM and MQL data according to defined precedence rules, ensuring consistent data for both UI display and LLM inference.

## Field Precedence Rules Summary

| Field | Winner | Condition |
|-------|--------|-----------|
| Designation | CRM | Always |
| Employer | MQL | Only if MQL is not empty |
| Location | MQL | Only if MQL is not empty |
| Age | MQL | Only if MQL is not empty |
| Gender | MQL | Only if MQL is not empty |
| Locality Grade | MQL | Only if MQL is not empty |
| Income | MQL | Only if MQL is not empty |
| Occupation Type | CRM | Always |
| Budget | Complementary | Use both sources |

---

## Implementation Approach

### 1. Create Shared Utility Function

Create a new utility file `src/utils/leadStandardization.ts` that exports a standardization function usable in both frontend and edge functions.

```text
src/utils/leadStandardization.ts
├── StandardizedLead interface
├── standardizeLead(crmData, mqlData) → StandardizedLead
├── Field precedence constants
└── Conflict tracking (which fields were overridden)
```

### 2. Standardized Lead Interface

```
StandardizedLead {
  // Identity
  name: string
  phone: string
  email: string
  
  // Demographics (MQL preferred where available)
  age: number | null              // MQL > CRM
  gender: string | null           // MQL > CRM
  
  // Professional (Mixed precedence)
  designation: string | null      // CRM > MQL
  employer: string | null         // MQL > CRM (if not empty)
  occupationType: string | null   // CRM > MQL
  
  // Location (MQL preferred where available)
  location: string | null         // MQL > CRM (if not empty)
  localityGrade: string | null    // MQL > CRM (if not empty)
  
  // Financial
  income: number | null           // MQL > CRM (if not empty)
  budget: {                       // Complementary
    crmStated: number | null
    mqlDerived: number | null
    effective: number | null
  }
  
  // Metadata
  dataSource: {
    designation: 'crm' | 'mql'
    employer: 'crm' | 'mql'
    location: 'crm' | 'mql'
    age: 'crm' | 'mql'
    gender: 'crm' | 'mql'
    localityGrade: 'crm' | 'mql'
    income: 'crm' | 'mql'
    occupationType: 'crm' | 'mql'
  }
  
  // Conflict flags (for transparency)
  conflicts: Array<{
    field: string
    crmValue: any
    mqlValue: any
    selectedSource: 'crm' | 'mql'
  }>
}
```

### 3. Implementation Logic

```
function standardizeLead(crmData, mqlData):
  
  // CRM Always Wins
  designation = crmData.designation || mqlData?.designation
  occupationType = crmData.occupation || crmData.occupationType
  
  // MQL Wins If Not Empty
  employer = mqlData?.employerName || crmData.company
  location = mqlData?.location || crmData.currentResidence
  age = mqlData?.age || null
  gender = mqlData?.gender || null
  localityGrade = mqlData?.localityGrade || null
  income = mqlData?.finalIncomeLacs || null
  
  // Complementary (Budget)
  budget = {
    crmStated: extractBudget(crmData.budget),
    mqlDerived: null,  // MQL doesn't provide budget
    effective: extractBudget(crmData.budget)
  }
  
  // Track conflicts where both sources have values
  conflicts = detectConflicts(crmData, mqlData)
  
  return { ...fields, dataSource, conflicts }
```

---

## Integration Points

### 1. Edge Function (analyze-leads)

Update `buildStage1Prompt()` and `buildStage2Prompt()` to use standardized data:

```
// Before calling LLM
const standardized = standardizeLead(lead.crm_data, enrichment)

// Pass to prompt
const prompt = buildStage1Prompt({
  ...leadData,
  standardized  // Single source of truth
})
```

### 2. Frontend Components

Update components to use standardized data:

- `LeadReportModal.tsx` - Remove manual designation logic, use standardized
- `LeadCard.tsx` - Use standardized fields
- `LeadsTable.tsx` - Use standardized fields for display

### 3. Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CRM Data  │────▶│                  │────▶│ UI Components   │
│ (leads.crm) │     │ standardizeLead()│     │ LeadReportModal │
└─────────────┘     │                  │     │ LeadCard        │
                    │                  │     └─────────────────┘
┌─────────────┐     │  ┌────────────┐  │     ┌─────────────────┐
│  MQL Data   │────▶│  │ Precedence │  │────▶│ LLM Inference   │
│(enrichments)│     │  │   Rules    │  │     │ analyze-leads   │
└─────────────┘     │  └────────────┘  │     └─────────────────┘
                    └──────────────────┘
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/leadStandardization.ts` | Create | Standardization function and types |
| `supabase/functions/analyze-leads/index.ts` | Modify | Use standardized data in prompts |
| `src/components/LeadReportModal.tsx` | Modify | Use standardized fields |
| `src/components/LeadCard.tsx` | Modify | Use standardized fields |
| `src/pages/Index.tsx` | Modify | Apply standardization when assembling leads |
| `src/types/lead.ts` | Modify | Add StandardizedLead type |

---

## Technical Details

### CRM Field Mapping

Map raw CRM column names to standardized fields:

```
CRM Column → Standardized Field
─────────────────────────────────
"Designation" → designation
"Place of Work (Company Name)" → company (fallback for employer)
"Current Residence" → currentResidence (fallback for location)
"Budget" → budget.crmStated
"Occupation" → occupationType
```

### MQL Field Mapping

```
MQL Field → Standardized Field
──────────────────────────────
employment_details[0].employer_name → employer
employment_details[0].designation → designation (fallback)
person_info.age → age
person_info.gender → gender
locality_grade → localityGrade
income.final_income_lacs → income
demography.current_city → location
```

### Empty Value Detection

Define "empty" as:
- `null`
- `undefined`
- Empty string `""`
- String "N/A" or "NA" (case insensitive)
- String "Unknown" (case insensitive)

---

## Conflict Tracking

The function will track conflicts for transparency:

```
conflicts: [
  {
    field: "employer",
    crmValue: "TCS",
    mqlValue: "Infosys Ltd",
    selectedSource: "mql",
    reason: "MQL preferred for employer"
  },
  {
    field: "location", 
    crmValue: "Kolshet, Thane",
    mqlValue: "Mumbai",
    selectedSource: "mql",
    reason: "MQL preferred for location"
  }
]
```

This data can be:
1. Stored in `lead_analyses` for audit
2. Displayed in UI (optional "Data Sources" accordion)
3. Included in LLM prompt for context

---

## Testing Considerations

1. **Unit tests** for standardization function with various data combinations
2. **Edge cases**: 
   - MQL enrichment failed (use CRM only)
   - CRM fields empty
   - Both sources have conflicting values
3. **Backwards compatibility**: Existing leads without enrichment should work

---

## Summary

This implementation creates a single source of truth for lead data by:

1. Centralizing precedence rules in one utility function
2. Making the function reusable across frontend and edge functions
3. Tracking which source was used for each field (audit trail)
4. Recording conflicts for transparency and debugging
5. Ensuring LLM inference and UI display use identical data
