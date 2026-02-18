

## Consolidated MQL Data View with Professional Reconciliation

### Overview
Restructure the MQL Raw Data tab into a cleaner, consolidated view with three major changes:
1. A new **Professional Summary** section that reconciles EPFO, LinkedIn, and GST data intelligently
2. A renamed and streamlined **Financial Summary** section (was "Banking Summary")
3. Merge location into **Personal Info** and remove the separate Demography section

### What Changes

#### 1. Professional Summary -- New Reconciled Section

Replace the current separate "Employment Details", "Business Details", and "LinkedIn Details" sections with a single **Professional Summary** section.

**Reconciliation logic** (implemented client-side in `MqlRawDataTab.tsx`):

- **Employer**: EPFO `employment_details[0].employer_name` (where `date_of_exit` is null = current) is the source of truth
- **Designation**: LinkedIn `current_designation` if available, otherwise default to "Professional"
- **Employment Type**: Derived from demography designation field (e.g., "Salaried, Company" -> "Salaried")
- **Tenure**: Calculated from EPFO `date_of_joining` of current employer
- **Business Status**: If `business_details` array has entries, check GST status. Show "Active Business: [name]" or "Inactive GST" accordingly. The MQL API provides GST data in the `business_details` array -- each entry has fields like `gst_number`, `business_name`, `business_type`, `status`. We check the `status` field for "Active" to determine if the business is currently operating.
- **Previous employers**: List from EPFO (those with `date_of_exit` set), showing employer name and tenure

**Display**: A compact card showing:
- Current Role: "[Designation] at [Employer]" (e.g., "Professional at COFORGE LIMITED")
- Employment Type: Salaried / Self-Employed
- Current Tenure: "Since Aug 2022 (3.5 years)"
- Active Business: (if GST is active) "[Business Name] - [Industry] - [Turnover Slab]"
- Previous Employers: Compact list with tenure

**Note on Gemini Flash reconciliation**: For this first iteration, the reconciliation will be done with deterministic client-side logic as described above. The rules are clear enough (EPFO = truth for employer, LinkedIn = truth for designation, fallback = "Professional"). An LLM call is not needed at this stage since the precedence rules are unambiguous. If edge cases emerge later (e.g., conflicting employer names needing fuzzy matching), we can add a Gemini Flash post-processing step in the `enrich-leads` function.

#### 2. Financial Summary -- Renamed and Streamlined

Rename "Banking Summary" to **Financial Summary** and show only these fields:
- Credit Score Range: Bucketed as "<600", "600-700", "700-800", "800+" (derived from `credit_score`)
- Final Income (Lacs): From `income.final_income_lacs`
- Total Active Loans: From `banking_summary.active_loans`
- Active Home Loans: Calculated from `banking_loans` array (active + loan_type contains "home"/"housing")
- Active Auto Loans: Calculated from `banking_loans` array (active + loan_type contains "auto"/"vehicle")
- Active Credit Cards: Count of active cards from `banking_cards` array
- Total Home + Auto EMI: Sum of `installment_amount` for active home and auto loans
- EMI to Monthly Income Ratio: Calculated from total EMI / monthly income

**Removed sections**: Banking Loans detail table, Banking Cards detail table, standalone Income section, standalone Credit Score section.

#### 3. Personal Info -- Add Location

- Move `demography.location` into the Personal Info section
- Remove the entire "Demography" section (its fields were: location, designation, city, state, pincode -- designation moves to Professional Summary, location to Personal Info, city/state/pincode are redundant with location)

### Files Changed

**`src/components/MqlRawDataTab.tsx`** -- Major rewrite of the section layout:
- Add `reconcileProfessionalData()` helper function that takes `employmentDetails`, `linkedinDetails`, `businessDetails`, and `demography` and returns a consolidated professional profile
- Add `getCreditScoreRange()` helper function
- Add `calculateFinancialSummary()` helper that computes active loan/card/EMI metrics from raw loan and card arrays
- Restructure sections to: Personal Info (with location) -> Professional Summary -> Financial Summary -> RTO/Vehicles

**No backend changes needed** -- all data is already in `raw_response`. This is purely a frontend display reorganization.

### Section Order (Final)

1. **Personal Info**: MQL Rating, Age, Gender, Location, Locality Grade, Lifestyle, Capability
2. **Professional Summary**: Current role, employment type, tenure, active business, previous employers
3. **Financial Summary**: Credit score range, income, active loans breakdown, EMI burden, EMI-to-income ratio
4. **RTO / Vehicle Ownership**: (unchanged)
