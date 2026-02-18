

## Increase MQL API Timeout to 140 Seconds

### What
Increase the MQL API request timeout in the `enrich-leads` edge function from 55 seconds to 140 seconds, giving the MQL API more time to respond before aborting.

### Why
The MQL API has been consistently timing out at the 55-second mark, causing all recent enrichment attempts to fail. Since leads are now processed one at a time (CHUNK_SIZE = 1), we have headroom up to ~150 seconds (the platform limit).

### Changes

**File: `supabase/functions/enrich-leads/index.ts`**
- Line ~98: Change `setTimeout(() => controller.abort(), 55000)` to `setTimeout(() => controller.abort(), 140000)`
- Line ~109: Update the timeout log message from "55 seconds" to "140 seconds"
- Line ~112: Update the stored error message from "55 seconds" to "140 seconds"

### Post-Deployment
After the function deploys, the 5 previously timed-out leads will need their cached N/A records deleted from `lead_enrichments` before re-running enrichment, since the system treats them as "already enriched."

