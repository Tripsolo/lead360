

## Lead Dashboard Overhaul

### Changes Overview

Five changes: move delete icon, add filter sidebar, redesign summary cards to Upgraded/Downgraded/Unchanged, rename column headers, and switch font to Aptos.

---

### 1. Move the delete (clear cache) icon above the logout button
**File: `src/pages/Index.tsx`**

Currently the Trash2 (clear cache) icon lives inside `LeadsTable` filters. Move it out to the top-right header area, positioned directly above the logout button. The header becomes a vertical stack on the right: delete icon on top, logout text below.

```
<div className="flex flex-col items-end gap-1">
  {userEmail?.endsWith('@raisn.ai') && (
    <Button variant="ghost" size="icon" onClick={...} className="text-destructive">
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
  <button onClick={handleLogout} className="flex items-center gap-1 text-sm ...">
    <LogOut className="h-4 w-4" /> Logout
  </button>
</div>
```

Remove the `onClearCache`, `isClearingCache`, and `userEmail` props from `LeadsTable`, and remove the Trash2 button from `LeadsTable.tsx`.

### 2. Create a filter sidebar (Sheet) with all filters
**File: `src/components/LeadsTable.tsx`**

- Remove the inline Project and Owner select dropdowns from the filter bar.
- Add a Filter icon button (from lucide `Filter`) next to the Download icon.
- Clicking it opens a `Sheet` (right-side slide-over panel) containing:
  - **Project** filter (existing select, moved here)
  - **Owner** filter (existing select, moved here)
  - **Manager Rating** filter (new select: All / Hot / Warm / Cold)
  - **AI Rating** filter (new select: All / Hot / Warm / Cold)
  - **MQL Rating** filter (new select: All / P0 / P1 / P2 / P3 / P4 / P5)
  - **Key Concern** filter (new select: All / Price / Location / Possession / Config / Amenities / Trust / Others)
  - A "Reset Filters" button at the bottom

The search bar and Download/Filter icon buttons remain inline at the top. The filter sheet provides all the detailed filtering.

New filter state variables: `managerRatingFilter`, `aiRatingFilter`, `mqlRatingFilter`, `concernFilter`. The filtering logic in `filteredLeads` will be extended to include these.

### 3. Redesign summary cards: Upgraded / Downgraded / Unchanged
**File: `src/components/SummaryCards.tsx`**

Complete rework of the card logic and interface:

- **Props change**: `onFilterChange` will accept `'Upgraded' | 'Downgraded' | 'Unchanged' | null` instead of `'Hot' | 'Warm' | 'Cold' | null`.
- **Counting logic**: Only count leads that have BOTH `rating` (AI) and `managerRating`:
  - **Upgraded**: AI rating order > Manager rating order (e.g., Manager=Cold, AI=Warm)
  - **Downgraded**: AI rating order < Manager rating order
  - **Unchanged**: AI rating order = Manager rating order
  - Rating order: Hot=3, Warm=2, Cold=1
- **Icons**: `ArrowUp` (green) for Upgraded, `ArrowDown` (red) for Downgraded, `Minus` (amber) for Unchanged
- **Display**: Count and percentage of total leads with both ratings

**File: `src/pages/Index.tsx`** and **`src/components/LeadsTable.tsx`**:
- Update `ratingFilter` state type to `'Upgraded' | 'Downgraded' | 'Unchanged' | null`
- Update `LeadsTable` filtering logic: when `ratingFilter` is one of these values, compute the comparison for each lead and filter accordingly

### 4. Rename column headers
**File: `src/components/LeadsTable.tsx`**

- "Lead Name" becomes "Name"
- "Lead Owner" becomes "Owner"

### 5. Change font to Aptos
**File: `src/index.css`** and **`index.html`**

- Add `@font-face` declarations for Aptos (using a web-safe fallback stack since Aptos is a Microsoft font). We will use the CSS font stack: `'Aptos', 'Calibri', 'Helvetica Neue', sans-serif`
- Update the `body` rule to apply this font family
- Add the font family as a CSS variable or directly in Tailwind config

**File: `tailwind.config.ts`**
- Set `fontFamily.sans` to `['Aptos', 'Calibri', 'Helvetica Neue', 'sans-serif']`

---

### Files Changed
- `src/pages/Index.tsx` -- Move delete icon to header, update filter type, pass user email for delete visibility
- `src/components/LeadsTable.tsx` -- Filter sidebar with Sheet, new filter fields, remove inline selects, rename columns, remove clear cache button
- `src/components/SummaryCards.tsx` -- Upgraded/Downgraded/Unchanged logic and UI
- `src/index.css` -- Aptos font
- `tailwind.config.ts` -- Aptos font family

