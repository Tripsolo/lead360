

# Delete All Leads and Related Data for Project eternia_parkcity_thane

## Summary

This plan will safely delete all lead-related data for the project `eternia_parkcity_thane` from three tables while preserving all other data (projects, brands, sister_projects, approved_domains).

## Data to be Deleted

| Table | Records | Condition |
|-------|---------|-----------|
| `lead_enrichments` | 251 | `project_id = 'eternia_parkcity_thane'` |
| `lead_analyses` | 160 | `project_id = 'eternia_parkcity_thane'` |
| `leads` | 346 | `project_id = 'eternia_parkcity_thane'` |

## Data NOT Touched

| Table | Records | Status |
|-------|---------|--------|
| `projects` | - | Preserved |
| `brands` | - | Preserved |
| `sister_projects` | - | Preserved |
| `approved_domains` | - | Preserved |

---

## Technical Details

### Deletion Order

The deletions must happen in this specific order to maintain referential integrity:

1. **First**: Delete `lead_enrichments` (references leads by lead_id)
2. **Second**: Delete `lead_analyses` (references leads by lead_id)  
3. **Third**: Delete `leads` (the parent table)

### SQL Statements

Three DELETE statements will be executed:

```sql
-- Step 1: Delete enrichments for the project
DELETE FROM lead_enrichments 
WHERE project_id = 'eternia_parkcity_thane';

-- Step 2: Delete analyses for the project
DELETE FROM lead_analyses 
WHERE project_id = 'eternia_parkcity_thane';

-- Step 3: Delete leads for the project
DELETE FROM leads 
WHERE project_id = 'eternia_parkcity_thane';
```

---

## Safety Measures

1. All queries use explicit `WHERE project_id = 'eternia_parkcity_thane'` condition
2. No other tables are affected
3. No cascade deletes are used - each table is deleted explicitly
4. Deletion order prevents orphaned foreign key references

---

## Verification After Deletion

Post-deletion query to confirm all data was removed:

```sql
SELECT 
  (SELECT COUNT(*) FROM leads WHERE project_id = 'eternia_parkcity_thane') as remaining_leads,
  (SELECT COUNT(*) FROM lead_analyses WHERE project_id = 'eternia_parkcity_thane') as remaining_analyses,
  (SELECT COUNT(*) FROM lead_enrichments WHERE project_id = 'eternia_parkcity_thane') as remaining_enrichments;
```

Expected result: All counts should be 0.

