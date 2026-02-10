

# Plan: Clear All Lead Data (Leads, Enrichments, Analyses)

## What Will Be Deleted

| Table | Description |
|-------|-------------|
| `lead_analyses` | All AI analysis results (ratings, insights, full_analysis JSON) |
| `lead_enrichments` | All MQL enrichment data (credit scores, income, lifestyle, etc.) |
| `leads` | All uploaded lead CRM data (phone numbers, names, visit history) |

## What Will NOT Be Touched

- `projects` — project metadata
- `brands` — brand configuration and Excel schemas
- `sister_projects` — cross-sell configuration
- `tower_inventory` — tower/pricing knowledge base
- `competitor_pricing` — competitor knowledge base
- `approved_domains` — access control

## Execution Order

Delete in dependency order (children first):
1. `DELETE FROM lead_analyses;`
2. `DELETE FROM lead_enrichments;`
3. `DELETE FROM leads;`

## Technical Notes

- No foreign key constraints between these three tables (they use text `lead_id`, not FK references), so order is a safety precaution rather than a strict requirement.
- This affects the **Test** environment only. If you also need to clear the **Live** environment, you would run the same SQL via Cloud View with Live selected.

