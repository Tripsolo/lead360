

## Extract RTO/Vehicle Data and Fix Age/Gender UI Display

### Problem 1: Age/Gender Not Showing in UI
Age and gender ARE correctly stored in the database (e.g., 37/Male, 36/Male). The edge function extraction works fine. The issue is likely in how the frontend maps the `lead_enrichments` DB row to the `MqlEnrichment` TypeScript interface -- need to trace the data flow from DB query to the Lead object displayed in UI.

### Problem 2: RTO Vehicle Data Not Captured
The MQL API now returns `rto_details` containing vehicle ownership data, but the `enrich-leads` function ignores it entirely. This data needs to be:
1. Stored in the database (new columns or in existing `raw_response`)
2. Displayed in the MQL Raw Data tab
3. Optionally used in lead scoring (vehicle lifestyle signal)

---

### Technical Changes

#### 1. Database Migration -- Add RTO columns to `lead_enrichments`

New columns on `lead_enrichments`:
- `rto_vehicle_count` (integer) -- number of vehicles owned
- `rto_vehicle_value` (numeric) -- total vehicle value
- `rto_pre_tax_income` (numeric) -- RTO-derived pre-tax income
- `rto_lifestyle` (text) -- lifestyle tag from vehicle (luxury/aspirational/value_for_money)
- `rto_vehicle_details` (jsonb) -- full vehicle array for display

#### 2. Edge Function -- `supabase/functions/enrich-leads/index.ts`

After the existing business_details parsing (~line 210), add RTO extraction:

```typescript
const rtoDetails = mqlData.rto_details || {};
const rtoVehicles = rtoDetails.vehicles || [];
const rtoIncomeRange = rtoDetails.income_range_rto || {};
```

Add to the `enrichmentData` object (~line 305):
```typescript
rto_vehicle_count: rtoVehicles.length || null,
rto_vehicle_value: rtoIncomeRange.vehicle_value || null,
rto_pre_tax_income: rtoDetails.pre_tax_income_rto || null,
rto_lifestyle: rtoVehicles[0]?.lifestyle || null,
rto_vehicle_details: rtoVehicles.length > 0 ? rtoVehicles : null,
```

#### 3. Frontend -- Trace and fix age/gender display

Investigate the data flow:
- How `lead_enrichments` rows are fetched and mapped to the `Lead.mqlEnrichment` object
- Ensure `age` and `gender` fields are correctly passed through
- The `MqlEnrichment` interface already has `age` and `gender` fields, so the issue is in the query/mapping layer

#### 4. MQL Raw Data Tab -- `src/components/MqlRawDataTab.tsx`

Add a new "RTO / Vehicle Ownership" section displaying:
- Vehicle details table (maker, model, year, price, fuel type, lifestyle)
- RTO-derived income range
- RTO addresses

#### 5. Lead Type -- `src/types/lead.ts`

No changes needed -- `rawResponse` already captures the full response including `rto_details`.

---

### Sequencing

1. Run DB migration (add RTO columns)
2. Update edge function to extract RTO data
3. Trace and fix age/gender UI mapping
4. Add RTO section to MQL Raw Data tab
5. Deploy and re-test with existing enriched leads (data already in `raw_response`)

