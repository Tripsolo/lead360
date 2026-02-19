

## Move Action Buttons and Icons on the Leads List Page

### Current Layout

The leads list page (post-upload) currently has:
- **Navbar row**: Raisn logo + Customer360 title | Clear Cache (trash) + Logout
- **Action buttons row** (lines 977-1019): Re-analyze Failed (conditional), spacer, Enrich, Ask AI, New, Analytics icon
- **Summary Cards**
- **LeadsTable** which has its own toolbar: spacer, Search input, Filter icon, Export (download) icon

### Proposed Layout

- **Navbar row**: Raisn logo + Customer360 | Export icon, Analytics icon, Clear Cache (trash), Logout
- **No separate action buttons row** -- remove the `space-y-8` gap from that section
- **Summary Cards** (directly after navbar content)
- **LeadsTable toolbar**: Re-analyze Failed (conditional), Enrich, Ask AI, New, spacer, Search, Filter

This eliminates the standalone action button row and consolidates everything into logical groups.

---

### Technical Details

**File: `src/pages/Index.tsx`**

1. **Move Export and Analytics icons to the navbar** (lines 946-961): Add the Analytics icon button and Export button (currently the download icon inside LeadsTable) next to the Clear Cache and Logout buttons in the navbar.

2. **Move Enrich, Ask AI, New buttons into LeadsTable**: Pass these as props or as a render prop/slot to LeadsTable so they appear in the search/filter row. The simplest approach: pass action button props (callbacks + disabled states) to LeadsTable and render them there.

3. **Remove the standalone action buttons div** (lines 976-1019): Delete this entire block.

4. **Remove `space-y-8`** on the wrapper div (line 975) and use `space-y-6` for tighter spacing.

**File: `src/components/LeadsTable.tsx`**

5. **Extend LeadsTableProps** to accept action button props:
```
interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  ratingFilter: string | null;
  onExport: () => void;
  // New props for action buttons
  onEnrich?: () => void;
  onAnalyze?: () => void;
  onNew?: () => void;
  onReanalyze?: () => void;
  isEnriching?: boolean;
  isAnalyzing?: boolean;
  isReanalyzing?: boolean;
  failedAnalysisCount?: number;
}
```

6. **Update the toolbar row** (lines 182-203) to include the action buttons on the left, then spacer, then search + filter on the right:
```
<div className="flex flex-col md:flex-row gap-2 items-stretch w-full">
  {/* Left: action buttons */}
  {failedAnalysisCount > 0 && <ReanalyzeButton />}
  {onEnrich && <EnrichButton />}
  {onAnalyze && <AskAIButton />}
  {onNew && <NewButton />}
  <div className="flex-1" />
  {/* Right: search + filter */}
  <SearchInput />
  <FilterButton />
</div>
```

7. **Remove the Export (download) button** from LeadsTable toolbar since it moves to the navbar.

**File: `src/pages/Index.tsx` (navbar updates)**

8. **Add Analytics and Export to navbar**: The navbar buttons section becomes:
```
<div className="flex flex-row items-center gap-2">
  <Button variant="ghost" size="icon" onClick={handleExport} title="Export">
    <Download className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" onClick={() => navigate('/project-analytics')} title="Analytics">
    <BarChart3 className="h-4 w-4" />
  </Button>
  {clearCacheButton}
  {logoutButton}
</div>
```

Only show Export and Analytics icons when `leads.length > 0`.

### Summary of files changed

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Move Export + Analytics icons to navbar; remove standalone action buttons row; pass action callbacks to LeadsTable; reduce spacing |
| `src/components/LeadsTable.tsx` | Accept action button props; render Enrich/Ask AI/New/Re-analyze in toolbar row; remove Export button from toolbar |

