
## Overview Tab Layout Changes in `src/pages/LeadProfile.tsx`

### 1. Match Rationale and Buyer Persona card sizes

Both cards currently use `flex-1 min-w-[250px]`. They will be changed to use equal fixed widths and a shared minimum height so they always match. Both cards will use the same border/background style for visual consistency.

### 2. Move Persona badge into Buyer Persona card

Remove the `Badge` showing `analysis.persona` from below the lead name (lines 259-261). Instead, place the persona name (e.g., "Aspirant Upgrader") as a badge in the top-right corner of the Buyer Persona card using `flex justify-between` in the card header.

### 3. Buyer Persona description as bullet points

Split `analysis.persona_description` into bullet points the same way rationale is split (on sentence boundaries), and render as a `<ul>` list matching the rationale style.

### 4. Move Financial Profile into a third column

Remove the standalone Financial Profile section (lines 394-421, including its Separator). Add a third column to the grid at line 301, changing it from `md:grid-cols-2` to `md:grid-cols-3`. The new column will show Budget, In-Hand Funds, and Funding Source as text-label rows (same style as Property Preferences uses: `<span className="text-muted-foreground">Label: </span><span>Value</span>`).

### 5. Clean up Lead Details

Remove:
- Phone number row (lines 305-310)
- Age/Gender row (lines 317-324)

Replace icon-based labels with text labels for remaining fields. Each field will use the pattern:
```text
<div className="text-sm">
  <span className="text-muted-foreground">Designation: </span>
  <span>{value}</span>
</div>
```

---

### Technical Details

**Rationale/Persona row (lines 272-296):**
```text
<div className="grid grid-cols-2 gap-4">
  <!-- Rating Rationale -->
  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
    <p className="text-[10px] uppercase ...">Rating Rationale</p>
    <ul className="list-disc list-inside space-y-1">
      {rationalePoints.map(...)}
    </ul>
  </div>

  <!-- Buyer Persona -->
  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Users ... />
        <h4>Buyer Persona</h4>
      </div>
      <Badge variant="outline">{analysis?.persona || 'N/A'}</Badge>
    </div>
    <ul className="list-disc list-inside space-y-1">
      {personaPoints.map(...)}
    </ul>
  </div>
</div>
```

**Persona description split logic:**
```text
const personaPoints = (analysis?.persona_description || '')
  .split(/(?<=\.)\s+/)
  .filter(s => s.trim().length > 0);
```

**Three-column grid (lines 301-392 become 301-new):**
```text
<div className="grid md:grid-cols-3 gap-6">
  <!-- Lead Details (text labels, no phone/age/gender) -->
  <!-- Property Preferences (unchanged) -->
  <!-- Financial Profile (text label style) -->
  <div className="space-y-4">
    <h3 className="font-semibold text-sm">Financial Profile</h3>
    <div className="text-sm">
      <span className="text-muted-foreground">Budget: </span>
      <span>{formatBudget(...)}</span>
    </div>
    <div className="text-sm">
      <span className="text-muted-foreground">In-Hand Funds: </span>
      <span>{formatInHandFunds(...)}</span>
    </div>
    <div className="text-sm">
      <span className="text-muted-foreground">Funding Source: </span>
      <span>{lead.fundingSource || 'No data available'}</span>
    </div>
  </div>
</div>
```

**Lead Details text labels (replacing icons):**
- "Email" instead of Mail icon
- "Designation" instead of Briefcase icon
- "Employer" instead of Briefcase icon
- "Work Location" instead of Building2 icon
- "Building" instead of Home icon
- "Residence" instead of Home icon (with locality grade badge inline)

### Files Changed
- `src/pages/LeadProfile.tsx`
