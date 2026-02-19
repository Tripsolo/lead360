

## Move Ratings to Header & Clean Up MQL Tab

### Changes Overview

Move the four key ratings (Manager, MQL, AI, PPS) out of the Overview tab and into the persistent header area next to the lead name. Move the persona badge below the name. Remove the MQL Highlights section from the MQL Raw Data tab.

---

### 1. Restructure lead header area (`src/pages/LeadProfile.tsx`)

**Current layout (lines 241-247):**
- Lead name + persona badge in one row

**New layout:**
- Row 1: Lead name on the left, rating cards (Manager, MQL, AI, PPS circle) on the right -- all in one flex row
- Row 2: Persona badge below the name (small text, left-aligned)

This section sits above the Tabs component, so ratings are always visible regardless of which tab is active.

### 2. Remove ratings from Overview tab (`src/pages/LeadProfile.tsx`)

**Current (lines 257-271):** Rating cards row inside the Overview tab content.

Remove the Manager, MQL, AI, and PPS rating cards from inside the Overview tab. Keep the Rating Rationale and Buyer Persona cards as-is but adjust them to fill the row (since they no longer share space with rating cards).

### 3. Remove MQL Highlights from MQL Raw Data tab (`src/components/MqlRawDataTab.tsx`)

**Current (lines 152-170):** "MQL Highlights" heading + 4 colored cards (MQL Rating, Capability, Lifestyle, Locality Grade) + Separator.

Delete this entire block (lines 152-170) so the MQL Raw Data tab starts directly with "Personal Info".

---

### Technical Details

**New header structure in LeadProfile.tsx:**
```text
<div className="mb-6">
  <div className="flex items-center justify-between gap-4">
    <h1 className="text-xl font-semibold">{lead.name}</h1>
    <div className="flex items-center gap-3 shrink-0">
      <RatingCard label="Manager" value={...} colorClass={...} />
      <RatingCard label="MQL" value={...} colorClass={...} />
      <RatingCard label="AI Rating" value={...} colorClass={...} />
      {PPS circle or N/A card}
    </div>
  </div>
  {analysis?.persona && (
    <Badge variant="outline" className="mt-1">{analysis.persona}</Badge>
  )}
</div>
```

**Overview tab adjustment:** The ratings row container (lines 257-271) is removed. The Rationale and Buyer Persona cards remain but are wrapped in their own flex row without the rating cards.

**MQL Raw Data tab:** Delete lines 152-170 (the "MQL Highlights" section heading, the 4 cards, and the Separator after it).

### Files Changed
- `src/pages/LeadProfile.tsx` -- Move ratings to header, persona below name, remove ratings from overview tab
- `src/components/MqlRawDataTab.tsx` -- Remove MQL Highlights section and its heading

