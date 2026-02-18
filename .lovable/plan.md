

## Fix Age/Gender Display and RTO Vehicle Column Mapping

### Problem 1: Age and Gender Not Showing
The MQL Raw Data tab's "Person Info" section tries to read `personInfo?.age` and `personInfo?.gender`, but the MQL API does NOT put these fields inside `person_info`. Instead, age and gender come from the `demography` object. The database stores them correctly (extracted from demography), but the UI reads from the wrong raw response node.

### Problem 2: RTO Vehicle Details Not Showing
The RTO vehicle table uses column keys `maker`, `model`, `year`, `price`, but the actual MQL API response uses different key names: `vehicle_maker`, `vehicle_model`, `manufacture_year`, `manufacturing_price`.

---

### Changes Required

**File: `src/components/MqlRawDataTab.tsx`**

1. Move Age and Gender from Person Info section to Demography section (where the data actually lives), or read them from the `demography` object instead:
   - Change `personInfo?.age` to `demography?.age`
   - Change `personInfo?.gender` to `demography?.gender`

2. Fix the RTO vehicle ArrayTable column keys to match the actual API response:
   - `maker` becomes `vehicle_maker`
   - `model` becomes `vehicle_model`
   - `year` becomes `manufacture_year`
   - `price` becomes `registration_price` (or `manufacturing_price`)
   - Add `fuel_type` (already correct)
   - `lifestyle` (already correct)

No backend or database changes needed -- this is purely a frontend display mapping fix.
