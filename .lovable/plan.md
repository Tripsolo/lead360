## Convert Lead Modal to Standalone Lead Page

### Overview

Replace the current `LeadReportModal` (dialog) with a dedicated `/lead/:leadId` route page. The page will have a branded Raisn navbar with back navigation, restructured overview tab with inline rating cards and PPS circle, and the reinstated Professional Summary section in the MQL Raw Data tab.

---

### 1. Create new Lead page: `src/pages/LeadProfile.tsx`

**Structure:**

- Branded navbar (same as Index page): Raisn logo + "Customer360" on left, back arrow/button on left or right to navigate back to the leads list
- Lead name + persona badge below the navbar
- Tabs: Overview | MQL Raw Data (same as current modal)

**Overview tab changes:**

**Ratings row** -- Use the same card style from the MQL Highlights section (colored border cards with label on top, value below). All in a single horizontal row in this order:

- Manager Rating (card)
- MQL Rating (card)  
- AI Rating (card)
- PPS (circular progress bar, same `PpsCircle` component from LeadsTable)

**Rating Rationale** -- Displayed as a wide, short card directly below the ratings row. The rationale text is split into bullet points (split on `.`  or sentence boundaries) for readability. Uses `flex` layout: wider and shorter than the current tall narrow card.

All other content (Lead Details, Property Preferences, Buyer Persona, Financial Profile, AI Analysis, Talking Points, Cross-Sell) remains the same as the current modal, just rendered on the full page.

### 2. Reinstate Professional Summary in MQL Raw Data tab

**File: `src/components/MqlRawDataTab.tsx**`

Add a "Professional Summary" section between "Personal Info" and "Financial Summary" sections. Uses the existing `reconcileProfessionalData` function from `mqlReconciliation.ts`:

- Current Role: `professional.currentRole`
- Employment Type: `professional.employmentType`
- Current Tenure: `professional.currentTenure`
- Active Business: `professional.activeBusiness` (if exists)
- Previous Employers: listed if any exist

Uses the Briefcase/Building2 icons already imported.

### 3. Update routing and navigation

**File: `src/App.tsx**`

- Add route: `<Route path="/lead/:leadId" element={<ProtectedRoute><LeadProfile /></ProtectedRoute>} />`

**File: `src/components/LeadsTable.tsx**`

- Change `onLeadClick` to navigate to `/lead/:leadId` instead of opening a modal
- Pass the lead data via React Router state (`navigate(`/lead/${lead.id}`, { state: { lead } })`)

**File: `src/pages/Index.tsx**`

- Remove `LeadReportModal` import and usage
- Remove `selectedLead` and `modalOpen` state
- Update `handleLeadClick` to use `navigate` instead of opening modal

### 4. Keep LeadReportModal.tsx

Keep the file but it will no longer be imported. Can be deleted in a future cleanup.

---

### Technical Details

**LeadProfile page data flow:**

- Receives lead data via `useLocation().state.lead`
- Falls back to fetching from database if state is missing (direct URL access): query `leads`, `lead_analyses`, and `lead_enrichments` tables by `leadId` param

**Ratings row card component (reuse MQL Highlights pattern):**

```text
const RatingCard = ({ label, value, colorClass }) => (
  <div className={`rounded-lg border px-3 py-2 text-center min-w-[80px] ${colorClass}`}>
    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);
```

**Rating rationale as bullets:**

```text
const rationalePoints = (analysis?.rating_rationale || '')
  .split(/(?<=\.)\s+/)
  .filter(s => s.trim().length > 0);
```

**PPS circle reuse:** Extract `PpsCircle` from LeadsTable into a shared component or duplicate inline in LeadProfile.

**Professional Summary section in MqlRawDataTab (between Personal Info and Financial Summary):**

```text
<Section title="Professional Summary">
  <DataRow label="Current Role" value={professional.currentRole} />
  <DataRow label="Employment Type" value={professional.employmentType} />
  <DataRow label="Current Tenure" value={professional.currentTenure} />
  {professional.activeBusiness && (
    <DataRow label="Business" value={professional.activeBusiness} />
  )}
</Section>
```

### Files Changed

- `src/pages/LeadProfile.tsx` -- New standalone lead page
- `src/components/MqlRawDataTab.tsx` -- Add Professional Summary section back
- `src/App.tsx` -- Add `/lead/:leadId` route
- `src/pages/Index.tsx` -- Remove modal, navigate to lead page on click
- `src/components/LeadsTable.tsx` -- Navigate instead of callback