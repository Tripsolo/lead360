## Create 4 Synthetic Leads + Fresh Enrichment + MD Report

### Goal
Add 4 new lead rows (without touching existing ones), enrich each via MQL, and export a single Markdown file with both the **raw MQL JSON** and the **structured/parsed fields** for all four.

### Steps

1. **Pick a template lead** — read one existing Kalpataru lead from `leads` (any recent P0/P1 row) to clone its `crm_data`, `project_id`, `brand_id`, and other non-identifying fields. This keeps the schema valid and avoids inventing CRM data.

2. **Insert 4 new lead rows** into `public.leads` via the insert tool, each with:
   - Fresh `id` (uuid) — clearly namespaced (e.g. `synthetic-<phone>`) so they're easy to identify/clean later
   - `crm_data` cloned from the template, but with:
     - Name overridden → `Parama` / `Sudhakar` / `Anant` / `Neeraj`
     - Phone overridden → `9986019306` / `9892049247` / `9004492954` / `9731151838`
   - Same `project_id` as the template (Kalpataru Parkcity Eternia)
   - Existing rows untouched.

3. **Invoke `enrich-leads` edge function** once with all 4 leads in the payload (function loops internally, one MQL call per lead). Uses live `MQL_API_KEY` + `x-schema: kalpataru` + `project_id: "Kalpataru Parkcity Eternia"`.

4. **Poll `lead_enrichments`** for the 4 synthetic `lead_id`s until each row has either a rating or an `N/A`/`FAILED` marker (short wait loop; ~5–10s between polls).

5. **Generate the report** at `/mnt/documents/enriched_leads_report.md` containing, per lead:
   - **Header**: input name + phone + resulting rating/status
   - **Structured section**: all typed columns from `lead_enrichments` (rating, capability, lifestyle, income, credit, loans summary, cards, RTO, LinkedIn-derived fields we parse, business, employment) — rendered as a readable key/value table
   - **Raw section**: full `raw_response` JSON in a fenced ```json block (unfiltered, including new envelope fields, `linkedin_details`, `rto_details.addresses`, per-lead `error`, etc.)
   - Cross-lead summary table at the top (name, phone, rating, income, credit score, active loans, employer)

6. **Deliver** the file via `<presentation-artifact>` so you can preview/download it directly.

### Notes
- No application code changes; no schema changes.
- Synthetic leads remain in DB (namespaced `synthetic-…`); I'll flag their IDs in the report so you can prune later if desired.
- If MQL returns `DATA_NOT_FOUND` for any of the four, the report will still include that lead's raw envelope + empty structured section (as with the earlier Chanderjit test).
