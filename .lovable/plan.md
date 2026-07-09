## Test MQL Enrichment with New Phone Number

### Goal
Trigger a fresh MQL API call using an existing lead's name but with phone `9892049247`, then extract and summarize the raw MQL response.

### Steps

1. **Pick a source lead** from the last batch (e.g. Parama Ghosh from project *Kalpataru Parkcity Eternia*) to reuse the name + project context.

2. **Invoke the `enrich-leads` edge function directly via curl** with a synthetic payload:
   - `leads: [{ id: <new-uuid>, name: "Parama Ghosh", phone: "9892049247" }]`
   - `projectId: <Kalpataru Parkcity Eternia project UUID>`
   
   Note: the edge function upserts into `lead_enrichments` keyed on `(lead_id, project_id)`. Using a fresh UUID as `lead_id` avoids polluting a real lead's cached record and bypasses the "already enriched" skip logic. Since there's no FK from `lead_enrichments.lead_id` to `leads.id` (to be verified), this insert will succeed standalone; if a FK exists, insert a temp row into `leads` first and clean it up after.

3. **Read the resulting row** from `lead_enrichments` via SQL to pull the full `raw_response` JSON for the synthetic lead.

4. **Report to you**:
   - The exact request sent (headers + body)
   - The full raw MQL response
   - A structured summary (rating, capability, demography, income, credit, loans, cards, RTO, employment, business, LinkedIn)

5. **Cleanup**: delete the synthetic `lead_enrichments` row (and temp `leads` row if created) so no test data lingers.

### Technical notes
- Uses `supabase--curl_edge_functions` to hit `enrich-leads` with the anon key.
- Uses `supabase--read_query` + `psql` for row inspection and cleanup via migration/insert tools.
- No application code changes.
