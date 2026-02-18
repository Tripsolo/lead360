## Lead Modal UI Tweaks

### Changes

#### 1. Fix "Current Role" fallback when no employment data exists

**File: `src/utils/mqlReconciliation.ts**`

Currently line 94 always produces `"Professional at Unknown"` when both LinkedIn designation and EPFO employer are missing. Change logic so that if both `designation` and `employerName` resolve to their defaults ("Professional" and "Unknown"), return `"N/A"` instead.

Updated logic:

```
const hasDesignation = linkedinDetails?.current_designation;
const hasEmployer = currentEmployment?.employer_name;
if (!hasDesignation && !hasEmployer) currentRole = 'N/A';
else currentRole = `${designation} at ${employerName}`;
```

#### 2. Round income to 0 decimals and make the label bigger

**File: `src/components/MqlRawDataTab.tsx**`

In the Financial Summary header (lines 199-203):

- Change `financial.finalIncomeLacs` display to `Math.round(financial.finalIncomeLacs)` (no decimals)
- Change the "Income" label from `text-xs` to `text-sm font-medium` so it stands out more

#### 3. Restructure Personal Info into two parts

**File: `src/components/MqlRawDataTab.tsx**`

Replace the current "Personal Info" section (lines 149-159) with:

**a) MQL Highlights section** -- a highlighted row of 4 badges/chips showing:

- MQL Rating (with color badge)
- Capability (with color badge)
- Lifestyle (with color badge)
- Locality Grade (with color badge)

Styled as a horizontal row with colored backgrounds, visually distinct.

**b) Personal Info section** -- double columns, 2 rows of factual data:

- Age
- Gender
- Location (with pincode extracted out)
- Pincode (extracted from location string using regex `/\b\d{6}\b/`)

#### 4. Remove enrichment timestamp

**File: `src/components/MqlRawDataTab.tsx**`

Remove lines 141-146 (the enriched-at badge block).

### Files Changed

- `src/utils/mqlReconciliation.ts` -- Current role N/A fallback
- `src/components/MqlRawDataTab.tsx` -- Income rounding, label size, personal info restructure, pincode extraction, and remove timestamp