

## Dashboard Tweaks

### 1. Align Delete and Logout icons horizontally
**File: `src/pages/Index.tsx`** (lines 947-963)

Change the header right section from a vertical stack (`flex-col`) to horizontal (`flex-row items-center gap-2`). Both the Trash2 icon and the Logout text+icon sit side by side.

### 2. Compact "New Leads" button to "New"
**File: `src/pages/Index.tsx`** (lines 1006-1009)

Change the button text from "New Leads" to "New". Keep the Upload icon.

### 3. Summary Cards: show Hot/Warm/Cold for CRM-only data, Upgraded/Downgraded/Unchanged after AI analysis
**File: `src/components/SummaryCards.tsx`**

Detect whether any leads have an AI `rating`. If no leads have AI ratings (CRM-only batch), show three cards based on `managerRating`:
- **Hot** -- count of leads with managerRating = Hot
- **Warm** -- count of leads with managerRating = Warm
- **Cold** -- count of leads with managerRating = Cold

If at least one lead has an AI `rating`, show the current Upgraded/Downgraded/Unchanged cards.

The `onFilterChange` prop type will expand to accept `'Hot' | 'Warm' | 'Cold' | 'Upgraded' | 'Downgraded' | 'Unchanged' | null`.

**File: `src/components/LeadsTable.tsx`**

Extend the `ratingFilter` handling to also support `'Hot'`, `'Warm'`, `'Cold'` values, filtering by `managerRating` match.

**File: `src/pages/Index.tsx`**

Update the `ratingFilter` state type comment (no code change needed since it's already `string | null`).

---

### Technical Details

**SummaryCards detection logic:**
```
const hasAiRatings = leads.some(l => l.rating);
```
When `hasAiRatings` is false, render Hot/Warm/Cold cards using `managerRating` counts. When true, render existing Upgraded/Downgraded/Unchanged cards.

**LeadsTable filter extension** -- add three cases:
```
if (ratingFilter === 'Hot') matchesRating = lead.managerRating?.toLowerCase() === 'hot';
if (ratingFilter === 'Warm') matchesRating = lead.managerRating?.toLowerCase() === 'warm';
if (ratingFilter === 'Cold') matchesRating = lead.managerRating?.toLowerCase() === 'cold';
```

### Files Changed
- `src/pages/Index.tsx` -- Horizontal delete+logout alignment, "New" button text
- `src/components/SummaryCards.tsx` -- Dual-mode cards (CRM vs AI-analyzed)
- `src/components/LeadsTable.tsx` -- Support Hot/Warm/Cold filter values
