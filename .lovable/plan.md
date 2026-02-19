## UI Consistency and Polish Fixes

### 1. Fix broken color classes on ProjectAnalytics page

All references to `text-rating-hot`, `text-rating-warm`, `text-rating-cold`, `bg-rating-hot`, `bg-rating-warm`, `bg-rating-cold` throughout `src/pages/ProjectAnalytics.tsx` must be replaced with `text-status-hot`, `text-status-warm`, `text-status-cold`, `bg-status-hot`, `bg-status-warm`, `bg-status-cold` to match the Tailwind config.

**File:** `src/pages/ProjectAnalytics.tsx` -- ~20+ occurrences across summary cards, manager performance badges, source performance badges, and CIS badges.

---

### 2. Add branded navbar to ProjectAnalytics page

Replace the plain "Back" button header (lines 197-202) with the same branded navbar used on Index and LeadProfile pages: Raisn logo, "Customer360" title, and a back button.

Remove the "Powered by Raisn.ai" subtitle text (line 207).

**File:** `src/pages/ProjectAnalytics.tsx`

---

### 3. Standardize heading sizes

- **ProjectAnalytics:** Change `text-3xl font-bold` to `text-xl font-semibold` for the "Project Analytics" heading to match LeadProfile.
- **LeadProfile "AI Analysis":** Change `text-lg` (line 414) to `text-sm` to match "Lead Details", "Property Preferences", and "Financial Profile" section headings.

**Files:** `src/pages/ProjectAnalytics.tsx`, `src/pages/LeadProfile.tsx`

---

### 4. Fix Logout button on Index page

Replace the raw `<button>` element (line 958) with the `<Button>` component using `variant="ghost" size="sm"` for visual consistency.

**File:** `src/pages/Index.tsx`

---

### 5. Reduce header-to-tabs whitespace on LeadProfile

Change `mb-6` on the header container (line 247) to `mb-3`, so combined with the `mb-4` on TabsList, the gap feels tighter and less wasted.

**File:** `src/pages/LeadProfile.tsx`

---

### 6. Move "Back" button in UploadWizard Step 2

Move the "Back" button from the bottom of the step (line 273) to the top, right after the selected project info box and before the file upload area.

**File:** `src/components/UploadWizard.tsx`

---

### 7. Fix back button on LeadProfile

The back button uses `navigate(-1)` which fails if the user navigated directly to the page. Change it to `navigate('/')` to always go to the dashboard.

**File:** `src/pages/LeadProfile.tsx`

---

### 8. Fix NotFound page navigation

Replace the `<a href="/">` tag with React Router's `<Link to="/">` to avoid full page reloads.

**File:** `src/pages/NotFound.tsx`

---

---

### 10. Extract shared PpsCircle component

Create a shared `src/components/PpsCircle.tsx` with a `size` prop (`sm` for table, `md` for profile). Remove duplicate implementations from `LeadProfile.tsx` and `LeadsTable.tsx`.

**File (new):** `src/components/PpsCircle.tsx`
**Files (edit):** `src/pages/LeadProfile.tsx`, `src/components/LeadsTable.tsx`

---

### 11. Unify getHighlightColor utility

Create `src/utils/highlightColor.ts` with the merged keyword set (including 'hot', 'p0', 'p1', 'p2', 'warm', 'cold', 'popular', 'affordable'). Remove duplicate definitions from `LeadProfile.tsx` and `MqlRawDataTab.tsx`.

**File (new):** `src/utils/highlightColor.ts`
**Files (edit):** `src/pages/LeadProfile.tsx`, `src/components/MqlRawDataTab.tsx`

---

### 12. Remove email field and locality grade badge from Lead Details

- Remove the conditional email field (lines 318-323) from the Lead Details section.
- Remove the `getLocalityGradeColor` function and the locality grade `Badge` from the Residence row. Dont even Show locality grade as plain text.

**File:** `src/pages/LeadProfile.tsx`

---



---

### Summary of files changed


| File                                 | Changes                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/ProjectAnalytics.tsx`     | Fix color classes, add branded navbar, remove "Powered by" text, standardize heading                                                                             |
| `src/pages/LeadProfile.tsx`          | Fix AI Analysis heading size, reduce header margin, fix back button, remove email field, remove locality badge styling, use shared PpsCircle + getHighlightColor |
| `src/pages/Index.tsx`                | Fix Logout button to use Button component                                                                                                                        |
| `src/components/UploadWizard.tsx`    | Move Back button to top of Step 2                                                                                                                                |
| `src/pages/NotFound.tsx`             | Use React Router Link instead of anchor tag                                                                                                                      |
| `src/components/LeadsTable.tsx`      | Use shared PpsCircle component                                                                                                                                   |
| `src/components/MqlRawDataTab.tsx`   | Use shared getHighlightColor utility                                                                                                                             |
| `src/components/PpsCircle.tsx` (new) | Shared PPS circular progress component with size prop                                                                                                            |
| `src/utils/highlightColor.ts` (new)  | Shared highlight color utility                                                                                                                                   |
