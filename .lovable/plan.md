
# Phase 3: Update Cross-Sell Prompt to Fetch Tower Inventory Data

## Overview

This update modifies the `buildCrossSellPrompt()` function in `supabase/functions/analyze-leads/index.ts` to:
1. Query the `tower_inventory` table for actual closing prices (Total Value)
2. Replace the current `sister_projects.metadata.configurations.price_cr` with `tower_inventory.closing_min_cr/closing_max_cr`
3. Use `tower_inventory.oc_date` for possession timeline validation
4. Update the Knowledge Base Field Explainer reference in cross-sell evaluation

## Current State

The `buildCrossSellPrompt()` function (lines 868-997) currently:
- Extracts configuration data from `sister_projects.metadata.configurations[].price_cr`
- Uses `meta.oc_date || meta.rera_possession` from sister project metadata
- Does NOT query `tower_inventory` table for actual closing prices

## Changes Required

### 1. Fetch Tower Inventory Data

Add a query to fetch `tower_inventory` data BEFORE calling `buildCrossSellPrompt()`:

```typescript
// Fetch tower inventory for all sister projects + main project
const { data: towerInventory } = await supabase
  .from("tower_inventory")
  .select("*")
  .in("project_id", [projectId, ...(sisterProjects?.map((sp: any) => sp.id) || [])]);

// Fetch competitor pricing for cross-sell context
const { data: competitorPricing } = await supabase
  .from("competitor_pricing")
  .select("*");
```

This query should be placed in the main `serve()` function around line 1467-1471, alongside the sister projects fetch.

### 2. Update buildCrossSellPrompt Function Signature

Add `towerInventory` and `competitorPricing` parameters:

```typescript
function buildCrossSellPrompt(
  analysisResult: any,
  extractedSignals: any,
  sisterProjects: any[],
  projectMetadata: any,
  towerInventory: any[],    // NEW
  competitorPricing: any[]  // NEW
): string
```

### 3. Update Sister Projects Data Building

Replace the current configuration price extraction with tower inventory lookup:

```typescript
// Group tower inventory by project_id for efficient lookup
const inventoryByProject = towerInventory.reduce((acc: any, inv: any) => {
  if (!acc[inv.project_id]) acc[inv.project_id] = [];
  acc[inv.project_id].push(inv);
  return acc;
}, {});

const sisterProjectsData = sisterProjects.map((sp: any) => {
  const meta = sp.metadata || {};
  const triggers = sp.cross_sell_triggers || {};
  
  // Get tower inventory for this sister project
  const projectInventory = inventoryByProject[sp.id] || [];
  
  // Group inventory by typology and get min/max closing prices
  const configsFromInventory = Object.values(
    projectInventory.reduce((acc: any, inv: any) => {
      const key = inv.typology;
      if (!acc[key]) {
        acc[key] = {
          type: inv.typology,
          carpet_sqft_min: inv.carpet_sqft_min,
          carpet_sqft_max: inv.carpet_sqft_max,
          closing_price_min_cr: inv.closing_min_cr,  // TOTAL VALUE - PRIMARY
          closing_price_max_cr: inv.closing_max_cr,  // TOTAL VALUE - PRIMARY
          oc_date: inv.oc_date,
          unsold: inv.unsold,
          construction_status: inv.construction_status,
          rooms: extractRoomCount(inv.typology)
        };
      } else {
        // Aggregate: min of mins, max of maxes
        acc[key].carpet_sqft_min = Math.min(acc[key].carpet_sqft_min, inv.carpet_sqft_min);
        acc[key].carpet_sqft_max = Math.max(acc[key].carpet_sqft_max, inv.carpet_sqft_max);
        acc[key].closing_price_min_cr = Math.min(acc[key].closing_price_min_cr, inv.closing_min_cr);
        acc[key].closing_price_max_cr = Math.max(acc[key].closing_price_max_cr, inv.closing_max_cr);
        acc[key].unsold += inv.unsold || 0;
        // Use earliest OC date
        if (inv.oc_date && (!acc[key].oc_date || new Date(inv.oc_date) < new Date(acc[key].oc_date))) {
          acc[key].oc_date = inv.oc_date;
        }
      }
      return acc;
    }, {} as Record<string, any>)
  );
  
  // Fallback to metadata if no inventory data
  const configs = configsFromInventory.length > 0 
    ? configsFromInventory 
    : (meta.configurations || []).map((c: any) => ({
        type: c.type,
        carpet_sqft_min: c.carpet_sqft?.[0] || null,
        carpet_sqft_max: c.carpet_sqft?.[1] || null,
        closing_price_min_cr: c.price_cr?.[0] || null,  // Fallback to old field
        closing_price_max_cr: c.price_cr?.[1] || null,
        rooms: extractRoomCount(c.type)
      }));
  
  // Determine earliest OC date from inventory
  const earliestOcDate = configsFromInventory.length > 0
    ? configsFromInventory.reduce((earliest: string | null, cfg: any) => {
        if (!earliest || (cfg.oc_date && new Date(cfg.oc_date) < new Date(earliest))) {
          return cfg.oc_date;
        }
        return earliest;
      }, null)
    : meta.oc_date || meta.rera_possession;
  
  // Check RTMI status from inventory
  const hasRtmi = projectInventory.some((inv: any) => 
    inv.construction_status?.toLowerCase().includes('oc received') ||
    (inv.current_due_pct && inv.current_due_pct >= 95)
  );
  
  return {
    name: sp.name,
    id: sp.id,
    relationship_type: sp.relationship_type,
    possession_date: earliestOcDate,  // From tower inventory OC Date
    is_rtmi: hasRtmi || (meta.oc_received && meta.oc_received.length > 0),
    unique_selling: meta.unique_selling || "N/A",
    payment_plan: meta.payment_plan || "N/A",
    configurations: configs,
    triggers: triggers,
    total_unsold_inventory: projectInventory.reduce((sum: number, inv: any) => sum + (inv.unsold || 0), 0)
  };
});
```

### 4. Update Cross-Sell Evaluation Rules in Prompt

Update the prompt text to reference `closing_price_min_cr` instead of `price_cr_min`:

```typescript
### RULE 1: BUDGET CEILING (20% MAX)
- The recommended project's entry price (closing_price_min_cr for matching config) must NOT exceed 120% of the lead's stated budget.
- closing_price_min_cr = All-inclusive Total Value (Base + Floor Rise + GST + Stamp Duty)
- Formula: IF (closing_price_min_cr > lead_budget * 1.20) THEN REJECT
- NEVER use base PSF * carpet area as a proxy for budget comparison.
```

### 5. Add Competitor Context for Cross-Sell

Include competitor pricing in the prompt for reference:

```typescript
## COMPETITOR REFERENCE (For Talking Points)
${competitorPricing.slice(0, 10).map((cp: any) => 
  `- ${cp.competitor_name} ${cp.project_name} ${cp.config}: ₹${cp.price_min_av}-${cp.price_max_av}L (${cp.avg_psf} PSF)`
).join('\n')}
```

### 6. Update Stage 2.5 Call Site

Modify the call to `buildCrossSellPrompt()` in the main loop (around line 2729):

```typescript
const crossSellPrompt = buildCrossSellPrompt(
  analysisResult,
  extractedSignals,
  sisterProjects,
  projectMetadata,
  towerInventory || [],   // NEW
  competitorPricing || [] // NEW
);
```

## File Changes Summary

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/analyze-leads/index.ts` | ~1467-1471 | Add `tower_inventory` and `competitor_pricing` fetch queries |
| `supabase/functions/analyze-leads/index.ts` | ~868-997 | Update `buildCrossSellPrompt()` to use tower inventory data |
| `supabase/functions/analyze-leads/index.ts` | ~2729-2734 | Update call site to pass new parameters |

## Technical Details

### Data Flow

```text
┌──────────────────────────────────────────────────────────────┐
│                      Main serve() Handler                    │
├──────────────────────────────────────────────────────────────┤
│  1. Fetch project metadata                                   │
│  2. Fetch sister_projects                                    │
│  3. Fetch tower_inventory (NEW)                              │
│  4. Fetch competitor_pricing (NEW)                           │
│  5. For each lead:                                           │
│     - Stage 1: Extract Signals                               │
│     - Stage 2: Score & Persona                               │
│     - Stage 2.5: Cross-Sell (uses tower_inventory prices)    │
│     - Stage 3: NBA & Talking Points                          │
└──────────────────────────────────────────────────────────────┘
```

### Price Field Mapping

| Old Field (sister_projects.metadata) | New Field (tower_inventory) | Description |
|--------------------------------------|----------------------------|-------------|
| `configurations[].price_cr[0]` | `closing_min_cr` | All-inclusive min price |
| `configurations[].price_cr[1]` | `closing_max_cr` | All-inclusive max price |
| `oc_date` (metadata) | `oc_date` (per tower) | Actual expected possession |
| N/A | `construction_status` | RTMI detection ("OC Received") |

### Fallback Logic

If `tower_inventory` has no data for a sister project:
1. Fall back to `sister_projects.metadata.configurations[].price_cr`
2. Log a warning for data gap tracking
3. Still apply cross-sell rules but with lower confidence

## Expected Outcomes

1. **Accurate Budget Comparisons**: Cross-sell uses `closing_min_cr` (all-inclusive Total Value) instead of agreement value or base PSF estimates
2. **Precise Possession Matching**: OC dates from `tower_inventory` per tower, not project-level RERA dates
3. **RTMI Detection**: Based on `construction_status = "OC Received"` from inventory data
4. **Inventory Awareness**: Cross-sell considers `unsold` count for urgency messaging
