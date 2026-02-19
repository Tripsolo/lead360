
## Fix Back Navigation from Lead Profile

### Problem
When clicking the back button on the lead profile page, the user returns to the Index page but sees the upload wizard instead of their leads list. This happens because:
1. The Index page stores leads only in React state (`useState`)
2. When navigating to `/lead/:id`, the Index component unmounts
3. On returning, the component remounts with an empty leads array, which triggers the upload wizard view

### Solution
Persist the current batch context in `sessionStorage` so the Index page can restore leads when remounting.

### Technical Details

**File: `src/pages/Index.tsx`**

1. **Save batch context to sessionStorage** -- after leads are loaded (both from file upload and from "AI-rated" view), store `{ projectId, leadIds, source }` in `sessionStorage` under a key like `cx360_batch`.

2. **Restore on mount** -- add a new `useEffect` that runs on mount: if `leads.length === 0` and `sessionStorage` has a saved batch, reload those leads from the database (similar to `loadAiRatedLeads` but using the stored lead IDs).

3. **Clear on "New"** -- when the user clicks "New" (the `handleReset` function), clear the sessionStorage entry so the upload wizard shows.

4. **Clear on logout** -- clear the sessionStorage entry when logging out.

Specifically:

- After `setLeads(enrichedLeads)` in `handleFileSelect` (~line 331), save:
  ```
  sessionStorage.setItem('cx360_batch', JSON.stringify({
    projectId,
    leadIds: enrichedLeads.map(l => l.id),
    source: 'upload'
  }));
  ```

- After `setLeads(mappedLeads)` in `loadAiRatedLeads`, save:
  ```
  sessionStorage.setItem('cx360_batch', JSON.stringify({
    projectId: projectId || '',
    source: 'ai-rated'
  }));
  ```

- Add a new `useEffect` after the auth effect:
  ```
  useEffect(() => {
    if (leads.length > 0 || isLoading) return;
    const saved = sessionStorage.getItem('cx360_batch');
    if (!saved) return;
    const batch = JSON.parse(saved);
    // Reload leads from DB using batch.projectId and batch.leadIds
    restoreLeadsFromSession(batch);
  }, [user]);
  ```

- Create a `restoreLeadsFromSession` function that fetches leads, analyses, and enrichments from the database using the saved project ID and lead IDs, then calls `setLeads(...)`.

- In `handleReset`, add `sessionStorage.removeItem('cx360_batch')`.
- In `handleLogout`, add `sessionStorage.removeItem('cx360_batch')`.
- In `handleClearCache`, add `sessionStorage.removeItem('cx360_batch')`.

**File: `src/pages/LeadProfile.tsx`**

- Keep `navigate(-1)` as-is -- this is correct since the Index page will now properly restore its state.

### Summary of files changed

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add sessionStorage persistence for batch context; add restore-on-mount logic; clear on reset/logout/clear-cache |
