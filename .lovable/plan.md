

## UI Tweaks: Vehicle Ownership, Financial Summary

### Changes

#### 1. Rename "RTO / Vehicle Ownership" to "Vehicle Ownership" and remove Lifestyle column
In `src/components/MqlRawDataTab.tsx`:
- Change section title from "RTO / Vehicle Ownership" to "Vehicle Ownership"
- Remove the `{ key: 'lifestyle', label: 'Lifestyle' }` column from the ArrayTable
- Keep Vehicle Value and RTO Pre-Tax Income fields (already present)

#### 2. Financial Summary -- Headline Income + Closed Home Loans

**Section header redesign**: Replace the plain `<Section title="Financial Summary">` with a custom header that shows "Financial Summary" on the left and the Final Income value as a headline metric on the top right (e.g., "12.5 Lacs"). Remove the Final Income DataRow from the grid since it moves to the header.

**New field**: Add "Closed Home Loans" to the grid, showing the count of home/housing loans with a closed/inactive status.

**Utility changes** in `src/utils/mqlReconciliation.ts`:
- Add `closedHomeLoans: number` to the `FinancialSummary` interface
- Calculate closed home loans: filter `bankingLoans` for non-active status + home/housing loan type keywords

### Files Changed
- `src/components/MqlRawDataTab.tsx` -- Section rename, lifestyle column removal, financial header with headline income, closed home loans row
- `src/utils/mqlReconciliation.ts` -- Add `closedHomeLoans` to interface and calculation

