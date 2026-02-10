

# Plan: Delete All Lead Data (Preserve KB and Project Metadata)

## What Will Be Deleted

These three tables contain lead-specific data tied to individual leads (phone numbers):

1. **`lead_analyses`** -- AI analysis results (ratings, insights, full_analysis JSON)
2. **`lead_enrichments`** -- MQL enrichment data (credit scores, income, loans, etc.)
3. **`leads`** -- Raw CRM data uploads (lead_id, crm_data, revisit dates)

All rows in these three tables will be deleted.

## What Will NOT Be Touched

- `projects` -- Project metadata
- `brands` -- Brand configurations and Excel schemas
- `sister_projects` -- Cross-sell project relationships
- `tower_inventory` -- Tower/unit inventory KB data
- `competitor_pricing` -- Competitor pricing KB data
- `approved_domains` -- Auth domain whitelist

## Execution Order

Due to no foreign key constraints between lead tables, all three can be deleted in any order:

```sql
DELETE FROM lead_analyses;
DELETE FROM lead_enrichments;
DELETE FROM leads;
```

## Technical Details

- These are `DELETE` operations (data removal), not schema changes
- No schema migrations needed -- table structures remain intact
- The app will show empty states after deletion until new leads are uploaded

