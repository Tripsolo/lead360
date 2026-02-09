
# Plan: Add MQL Raw Data Tab to Lead Report Modal

## Overview

Add a new tabbed interface to the LeadReportModal that displays the exhaustive raw MQL enrichment data received from the MQL service. This will allow comparison against CRM inputs to verify extraction and scoring accuracy.

## Technical Implementation

### File: `src/components/LeadReportModal.tsx`

#### Changes Required:

1. **Import Tabs components** (line ~1-11)
   - Add import for `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`

2. **Add new helper function** (after line ~75)
   - Create `formatMqlValue()` helper to display MQL values with proper formatting for different data types (numbers, dates, arrays, objects, booleans)

3. **Wrap main content in Tabs structure** (around line ~162)
   - Replace the current `<div className="space-y-6">` with a Tabs container
   - Create two tabs: "Overview" (existing content) and "MQL Raw Data" (new)
   - Move all existing modal content into "Overview" tab

4. **Create MQL Raw Data tab content** (new section)
   - Display data organized by MQL response sections:
     - **Person Info**: rating, age, gender, locality_grade, lifestyle, capability
     - **Demography**: location, designation, etc.
     - **Income**: final_income_lacs, pre_tax_income_lacs
     - **Banking Summary**: total_loans, active_loans, home_loans, auto_loans
     - **Banking Loans**: Array table showing each loan's details (type, sanction_date, sanction_amount, emi_amount, current_balance, status)
     - **Banking Cards**: Array table showing card details
     - **Business Details**: gst_number, business_name, business_type, industry, turnover_slab
     - **Employment Details**: Array of employment history
     - **Credit Score**: credit_score value
   - Handle cases where MQL data is not available (show "No MQL data available" message)

### Data Source

The MQL raw response is available at `lead.mqlEnrichment?.rawResponse` which contains the full `batchResponse` object stored during enrichment. The structure is:

```
rawResponse: {
  leads: [{
    person_info: { rating, age, gender, locality_grade, lifestyle, capability, ... },
    demography: { location, designation, ... },
    income: { final_income_lacs, pre_tax_income_lacs, ... },
    banking_summary: { total_loans, active_loans, home_loans, auto_loans, ... },
    banking_loans: [{ loan_type, sanction_date, sanction_amount, emi_amount, ... }],
    banking_cards: [{ card_type, usage_percent, ... }],
    business_details: { gst_number, business_name, industry, turnover_slab, ... },
    employment_details: [{ employer_name, designation, ... }],
    linkedin_details: { ... },
    credit_score: number
  }]
}
```

### UI Design

**Tab Layout**:
```
+-------------+------------------+
| Overview    | MQL Raw Data     |   <- TabsList at top of modal
+-------------+------------------+
|                                |
|  (Tab Content Area)            |
|                                |
+--------------------------------+
```

**MQL Raw Data Tab Layout**:
- Organized into collapsible sections with headers
- Each section displays key-value pairs in a grid format
- Arrays (loans, cards, employment) shown as mini-tables
- Use `ScrollArea` for sections with many items
- Show "N/A" or "Not available" for missing fields
- Include enriched_at timestamp at the top

### Visual Styling

- Section headers: Bold text with separator lines
- Key-value pairs: Label in muted color, value in normal weight
- Arrays: Compact table with alternating row backgrounds
- Empty states: "No data" in muted foreground color
- Tab when no MQL data: Show centered message with Database icon

---

## Summary

| Location | Change |
|----------|--------|
| Imports (line 1-11) | Add Tabs, TabsList, TabsTrigger, TabsContent imports |
| Helper functions (line ~75) | Add formatMqlValue() utility |
| Main content (line ~162) | Wrap in Tabs container with "Overview" and "MQL Raw Data" tabs |
| New section | Create MQL Raw Data tab content with organized sections |
