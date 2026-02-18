
## Reorganize Action Buttons and Remove Derived Export

### Changes

#### 1. Move Enrich & Analyze buttons to the right group, rename and compact
**File: `src/pages/Index.tsx`**

Currently the action bar has Enrich and Analyze on the left, then a spacer, then "New Leads" and analytics icon on the right. The new layout will be:

- Left: Re-analyze Failed button (only when visible)
- Right (grouped): **Enrich** | **Ask AI** | **New Leads** | Analytics icon

Both Enrich and Ask AI buttons will use `size="default"` (not `size="lg"`), smaller icons (`h-4 w-4`), and shorter text. They keep their current styling (outline for Enrich, emerald for Ask AI).

#### 2. Remove Export Derived Data functionality
**Files affected:**
- `src/pages/Index.tsx` -- Remove the `handleExportDerived` function (lines 770-787), the `exportDerivedFieldsToCSV` import (line 9), and the `onExportDerived` prop passed to LeadsTable (line 1042).
- `src/components/LeadsTable.tsx` -- Remove `onExportDerived` from the props interface, destructuring, the `FileSpreadsheet` import, and the derived export button (lines 194-197).
- `src/utils/derivedFieldsExport.ts` -- Delete this file entirely.

### Files Changed
- `src/pages/Index.tsx` -- Rearrange button order, rename CTAs, remove derived export
- `src/components/LeadsTable.tsx` -- Remove derived export button and prop
- `src/utils/derivedFieldsExport.ts` -- Delete file
