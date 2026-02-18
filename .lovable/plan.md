
## Fix Financial Summary Display and Remove Vehicle Fields

### Investigation Results

The database **does contain** the loan, EMI, and card data. For example:
- Lead `006fv000005uKvh`: 1 active Housing Loan, EMI of Rs 78,029, 11 total loans
- Lead `006fv000005un85`: 1 active Commercial Vehicle Loan, 6 total loans, 4 active credit cards

The reconciliation logic in `mqlReconciliation.ts` (using `is_active === true` boolean checks) is correct and should produce the right values. The most likely cause is that the **previous code edits have not yet been reflected** in the running app build.

To ensure this works reliably going forward, I will:

### Changes

#### 1. Remove Vehicle Value and RTO Pre-Tax Income from Vehicle Ownership
In `src/components/MqlRawDataTab.tsx`: These rows were supposed to be removed earlier but may still be present. Confirm removal.

#### 2. Add "Property Loan" to home loan keywords
The MQL data contains loans typed as "Property Loan" which are essentially home loans (home equity / LAP). The current keywords `['home', 'housing']` miss these. Adding `'property'` to `homeKeywords` in `src/utils/mqlReconciliation.ts` will capture Property Loans in the home loan counts.

#### 3. Add console logging for debugging
Add a temporary `console.log` in `MqlRawDataTab.tsx` to output the computed `financial` object so we can verify values are being calculated. This helps confirm the code is executing with the latest logic.

### Files Changed
- `src/utils/mqlReconciliation.ts` -- Add `'property'` to `homeKeywords` array
- `src/components/MqlRawDataTab.tsx` -- Confirm vehicle field removal, add debug logging for financial summary
