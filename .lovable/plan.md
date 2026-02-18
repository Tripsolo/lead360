

## Fix Financial Summary Data Extraction and Remove Vehicle Fields

### Root Cause Found

The MQL API response uses **`is_active: true/false`** (a boolean field) for both loans and credit cards -- NOT a `status` string field. The current reconciliation logic in `mqlReconciliation.ts` checks `status === 'active'` and `status === 'closed'`, which never matches, producing zeros for all loan/card/EMI counts.

**Evidence from actual data:**
```
is_active: true, loan_type: "Housing Loan", installment_amount: 155842
is_active: true, loan_type: "Auto Loan (Personal)", installment_amount: 26923
is_active: false, date_closed: "2025-12-10"
```

### Changes

#### File: `src/utils/mqlReconciliation.ts`

1. **Fix `isActiveLoan`**: Change from checking `status === 'active'` to checking `is_active === true` (boolean). Loans without `is_active` field and without `date_closed` are treated as active.

2. **Fix `closedHomeLoans`**: Change from checking `status === 'closed'` to checking `is_active === false` (or has `date_closed` set) combined with home/housing loan type match.

3. **Fix `activeCards`**: Change from checking `status === 'active'` to checking `is_active === true`. Cards use the same boolean pattern.

#### File: `src/components/MqlRawDataTab.tsx`

4. **Remove Vehicle Value and RTO Pre-Tax Income** rows from the Vehicle Ownership section (lines 232-237). Keep the vehicle table itself.

### Technical Detail

The `isActiveLoan` function becomes:
```typescript
const isActiveLoan = (loan) => {
  if (loan.is_active === true) return true;
  if (loan.is_active === false) return false;
  // fallback: no date_closed means active
  return !loan.date_closed;
};
```

Closed home loans become:
```typescript
const isClosedLoan = (loan) => loan.is_active === false || !!loan.date_closed;
```

Active cards become:
```typescript
const isActiveCard = (card) => card.is_active === true;
```

No backend changes needed.
