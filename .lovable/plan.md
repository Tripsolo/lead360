

## Leads Dashboard UI Refinements

### Changes Overview

Seven targeted UI tweaks to declutter and compact the leads list dashboard.

---

### 1. Remove Lead ID column (keep search)
**File: `src/components/LeadsTable.tsx`**

Remove the `<TableHead>Lead ID</TableHead>` header and the corresponding `<TableCell>` that displays `lead.id` from each row. The search input already searches by Lead ID -- that stays untouched.

### 2. Make logout button less prominent (Index page only)
**File: `src/pages/Index.tsx`**

Replace the outlined Button for logout with a plain text+icon element:
```tsx
<button onClick={handleLogout} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
  <LogOut className="h-4 w-4" />
  Logout
</button>
```
No container/border, just a small clickable text link. (ProjectAnalytics page has no logout button currently, so no change needed there.)

### 3. Remove duplicate "View Analytics" button
**File: `src/pages/Index.tsx`**

The header area (line 967-974) has a "View Analytics" button AND the action bar (line 1029-1036) has a BarChart3 icon button -- both navigate to `/project-analytics`. Remove the header "View Analytics" button, keeping only the icon button in the action bar.

### 4. Compact "Upload New File" button
**File: `src/pages/Index.tsx`**

Change the upload button text from "Upload New File" to "New Leads" and reduce size from `size="lg"` to `size="default"`:
```tsx
<Button variant="outline" onClick={handleReset}>
  <Upload className="mr-2 h-4 w-4" />
  New Leads
</Button>
```

### 5. Compact Summary Cards -- horizontal layout, shorter labels
**File: `src/components/SummaryCards.tsx`**

Redesign each card to place the icon and label ("Hot", "Warm", "Cold") side-by-side on one line, with count and percentage to the right. Remove the separate `h3` line. This reduces card height significantly.

New card layout:
```tsx
<CardContent className="p-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${color} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-semibold">{rating}</span>
    </div>
    <div className="text-right">
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs text-muted-foreground ml-1">{percentage}%</span>
    </div>
  </div>
</CardContent>
```
Labels change from "Hot Leads" to just "Hot", etc.

### 6. Format Last Visit as "DD MMM" (e.g., "26 Oct")
**File: `src/components/LeadsTable.tsx`**

Change the date cell from:
```tsx
new Date(lead.date).toLocaleDateString()
```
to:
```tsx
import { format } from 'date-fns';
// ...
format(new Date(lead.date), 'dd MMM')
```

### 7. Rename "PPS Score" column to "PPS"
**File: `src/components/LeadsTable.tsx`**

Change the header button text from "PPS Score" to "PPS".

---

### Files Changed
- `src/components/LeadsTable.tsx` -- Remove Lead ID column, date format, PPS rename
- `src/pages/Index.tsx` -- Remove View Analytics button, compact upload button, restyle logout
- `src/components/SummaryCards.tsx` -- Compact horizontal card layout with short labels
