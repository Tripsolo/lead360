## Leads Dashboard Visual Overhaul

### Changes Overview

Five changes: remove badge capsules from MQL/Manager ratings (use colored text instead), compress and reposition search bar, add circular PPS progress indicator next to AI rating, reorder rating columns, and add a branded Raisn header/navbar.

---

### 1. Remove capsule badges from Manager Rating and MQL Rating columns

**File: `src/components/LeadsTable.tsx**`

Replace the `<Badge>` wrappers for Manager Rating and MQL Rating cells with plain `<span>` elements. Use the same color-mapping logic but apply it as `text-status-hot`, `text-status-warm`, `text-status-cold` font colors instead of background fills.

- Manager Rating cell: `<span className="font-semibold text-status-hot">Hot</span>` (no Badge)
- MQL Rating cell: `<span className="font-semibold text-status-hot">P0</span>` (no Badge)
- AI Rating keeps its Badge capsule as-is

Helper functions `getRatingTextColor` and `getMqlRatingTextColor` return Tailwind text color classes instead of background classes.

### 2. Compress search bar and move it next to the filter icon (right-aligned)

**File: `src/components/LeadsTable.tsx**`

Change the filter bar layout:

- Remove `flex-1` from the search input wrapper
- Set it to a fixed width of roughly 50% (`w-1/2` or `max-w-xs`)
- Reorder elements so the search bar sits on the right, next to the Filter icon and Download icon
- Use `flex-1` spacer on the left to push everything right

New layout order: `[spacer] [Search] [Filter icon] [Download icon]`

### 3. PPS as circular progress bar next to AI Rating

**File: `src/components/LeadsTable.tsx**`

Create an inline circular progress indicator for the PPS score (0-100 scale). Use an SVG circle with a stroke-dasharray/dashoffset approach:

- 36px diameter circle
- Score text centered inside
- Color: green for 85+, orange for 65-84, red for below 65 (matching Hot/Warm/Cold thresholds)

### 4. Reorder rating columns

**File: `src/components/LeadsTable.tsx**`

New column order:

1. Name
2. Project
3. Phone
4. Owner
5. Last Visit
6. **Manager** (was after AI)
7. **MQL** (was after Manager)
8. **AI**
9. **PPS**
10. **Key Concern**

Update both `<TableHeader>` and `<TableBody>` cell order to match. 

### 5. Add branded Raisn header/navigation bar

**Files: `src/pages/Index.tsx`, new asset `src/assets/raisn-logo.png**`

Replace the current plain text header with a proper navigation bar:

- Copy the uploaded Raisn logo to `src/assets/raisn-logo.png`
- Add a full-width nav bar at the top of the page (outside the container) with:
  - Left: Raisn logo image (height ~32px)
  - Center or left-of-center: "Customer360" product name
  - Right: Delete icon (if applicable) and Logout button (horizontally aligned, as currently implemented)
- Style: white background, subtle bottom border, horizontal padding
- Remove the old `<h1>Customer360</h1>` and subtitle from the container body

---

### Technical Details

**Circular PPS Component (inline in LeadsTable.tsx):**

```text
const PpsCircle = ({ score }: { score: number }) => {
  const radius = 14, circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? 'text-status-hot' : score >= 65 ? 'text-status-warm' : 'text-status-cold';
  return (
    <svg width="36" height="36" className={color}>
      <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" 
              strokeWidth="3" opacity="0.2" />
      <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" 
              strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 18 18)" />
      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" 
            className="fill-current text-[10px] font-bold">{score}</text>
    </svg>
  );
};
```

**Rating text color helpers:**

```text
const getRatingTextColor = (rating?: string) => {
  switch (rating?.toLowerCase()) {
    case 'hot': return 'text-status-hot';
    case 'warm': return 'text-status-warm';
    case 'cold': return 'text-status-cold';
    default: return 'text-muted-foreground';
  }
};
```

**Navbar structure:**

```text
<nav className="bg-white border-b border-border sticky top-0 z-50">
  <div className="container mx-auto px-4 flex items-center justify-between h-14">
    <div className="flex items-center gap-3">
      <img src={raisnLogo} alt="Raisn" className="h-8" />
      <span className="text-lg font-semibold text-foreground">Customer360</span>
    </div>
    <div className="flex items-center gap-2">
      {/* Delete + Logout */}
    </div>
  </div>
</nav>
```

### Files Changed

- `src/assets/raisn-logo.png` -- Copy uploaded logo
- `src/pages/Index.tsx` -- Replace header with branded navbar, move delete+logout into navbar
- `src/components/LeadsTable.tsx` -- Remove Badge capsules from Manager/MQL, compress search bar to right, reorder columns, add PPS circle