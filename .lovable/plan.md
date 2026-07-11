## Test MQL Enrichment with Chanderjit / 8901040455

### Goal
Trigger a fresh MQL enrichment call using the new test identity (name: `Chanderjit`, phone: `8901040455`) and report back the full raw MQL response, including any new raw JSON fields the updated API now returns.

### Steps

1. **Pick project context** — reuse `Kalpataru Parkcity Eternia` (schema `kalpataru`) since it's the active MQL-configured project used in prior tests.

2. **Invoke `enrich-leads` edge function** via `supabase--curl_edge_functions` with a synthetic payload:
   - `leads: [{ id: "test-8901040455-chanderjit", name: "Chanderjit", phone: "8901040455" }]`
   - `projectId: <Kalpataru Parkcity Eternia UUID>`
   
   A fresh synthetic `lead_id` avoids polluting real lead records and bypasses the "already enriched" cache skip.

3. **Read `lead_enrichments`** for that synthetic `lead_id` via `supabase--read_query` to pull the full `raw_response` JSON.

4. **Also inspect edge function logs** (`supabase--edge_function_logs` on `enrich-leads`) to capture the raw request/response body logged inline — this surfaces any new top-level fields the updated MQL API is emitting even if the parser drops them before DB write.

5. **Report to you**:
   - Exact request sent (headers + body)
   - Full raw MQL response JSON (unfiltered)
   - Highlight of any **new fields** the updated API now returns vs. the previously known schema (person_info, demography, income, banking_summary, banking_loans, banking_cards, business_details, rto_details, employment_details)
   - Structured summary (rating, capability, demography, income, credit, loans, cards, RTO, employment, business, any new raw sections)

6. **Leave the synthetic row in place** (as with prior tests — delete permission not available via psql); it's clearly namespaced by the `test-…` ID.

### Notes
- No application code changes.
- Purely a diagnostic/testing task using existing tools.
