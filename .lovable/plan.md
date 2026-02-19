

## Move Rationale and Buyer Persona into the Ratings Row

### Changes in `src/pages/LeadProfile.tsx`

**Current layout:**
- Row 1: Rating cards + Rationale (rationale takes remaining space via `flex-1`)
- Row 2: 3-column grid with Lead Details, Property Preferences, Buyer Persona

**New layout:**
- Row 1: Rating cards (auto width) + Rating Rationale (30% width) + Buyer Persona (30% width), all in one flex row
- Row 2: 2-column grid with Lead Details and Property Preferences only

### Specific edits:

1. **Ratings row (lines 257-284):** Change the outer flex container to keep all three items in one row. The rating cards keep `shrink-0`. The Rationale card gets `w-[30%]` instead of `flex-1`, with height adjusting to content. 

2. **Add Buyer Persona into the same row:** Move the Buyer Persona card (currently at lines 381-397) into the ratings row flex container, right after Rationale. Give it the same `w-[30%]` width and matching border/padding style as the Rationale card.

3. **Remove Buyer Persona from the 3-column grid (lines 289-398):** Change the grid to `md:grid-cols-2` with only Lead Details and Property Preferences remaining.

### Technical Details

The ratings row will become:
```text
<div className="flex flex-wrap gap-4 items-start">
  {/* Rating cards - shrink-0 */}
  <div className="flex flex-wrap gap-3 items-center shrink-0">
    ... Manager, MQL, AI, PPS cards ...
  </div>

  {/* Rating Rationale - 30% width */}
  <div className="w-[30%] rounded-lg border border-border bg-muted/30 px-4 py-3">
    <p className="text-[10px] uppercase ...">Rating Rationale</p>
    <ul className="list-disc list-inside space-y-1">
      {rationalePoints.map(...)}
    </ul>
  </div>

  {/* Buyer Persona - 30% width, same style */}
  <div className="w-[30%] rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
    <div className="flex items-center gap-2 mb-2">
      <Users ... />
      <h4 ...>Buyer Persona</h4>
    </div>
    <p className="text-sm font-semibold mb-1">{analysis?.persona || 'N/A'}</p>
    <p className="text-sm text-muted-foreground">{persona_description}</p>
  </div>
</div>
```

The Lead Details / Property Preferences grid becomes:
```text
<div className="grid md:grid-cols-2 gap-6">
  {/* Lead Details */}
  {/* Property Preferences */}
</div>
```

### Files Changed
- `src/pages/LeadProfile.tsx` -- Restructure ratings row to include Rationale and Buyer Persona side-by-side at 30% width each; simplify grid below to 2 columns
