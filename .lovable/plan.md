
# Implementation Plan: Sister Projects & Enhanced Metadata Integration

## Status: ✅ COMPLETED (2026-01-30)

## Overview

This plan addresses the integration of detailed project knowledge from the uploaded Excel file, including:
1. ✅ Creating a new `sister_projects` table for cross-selling opportunities
2. ✅ Enhancing existing project metadata with detailed inventory and technical specs
3. ✅ Adding shared township-level data to brand metadata
4. 🔄 Updating competitor data with new entrants and detailed pricing (future enhancement)

---

## Database Changes

### 1. New Table: `sister_projects`

A dedicated table to store sister project information for cross-selling purposes.

```
+----------------------+
|   sister_projects    |
+----------------------+
| id (text, PK)        |
| parent_project_id    |   -> References projects.id (e.g., eternia_parkcity_thane)
| name (text)          |   -> "Primera", "Estella", "Immensa"
| brand_id (text)      |   -> References brands.id
| relationship_type    |   -> "township_sister" | "adjacent" | "same_developer"
| metadata (jsonb)     |   -> Project-specific inventory, pricing, possession
| cross_sell_triggers  |   -> When to recommend this project
| created_at           |
| updated_at           |
+----------------------+
```

**Why a separate table?**
- Sister projects have different inventory/pricing but share township benefits
- Cross-selling logic needs quick access to available inventory
- Keeps the main `projects` table focused on the primary analysis project
- Allows multiple sister project relationships per parent project

### 2. Enhanced `projects.metadata` Schema

Add new sections to the existing Eternia project metadata:

```
metadata: {
  // EXISTING FIELDS (preserved)
  buyer_personas: {...},
  common_objections: {...},
  competitors: [...],
  // ...

  // NEW SECTIONS
  technical_specifications: {
    architect: { name: "HB Design", country: "Singapore", notable_projects: [...] },
    landscape: { name: "One Landscape", country: "Hong Kong" },
    fire_safety: [...],
    smart_features: [...],
    bathroom_fittings: "Geberit / Jaquar / Kohler",
    flooring: { living: "Vitrified tiles", bedrooms: "Vitrified tiles" },
    windows: "Aluminium sliding full length windows"
  },

  tower_inventory: [
    {
      tower: "A",
      floors: 47,
      units_per_floor: 7,
      construction_status: "Basement 1 Complete",
      completion_percent: 3,
      oc_date: "2029-10-27",
      configurations: [
        {
          typology: "2 BHK",
          carpet_range: [600, 699],
          parking: "Single",
          total: 94, sold: 2, unsold: 92,
          price_range_cr: { sourcing: [1.55, 1.93], closing: [1.38, 1.77] },
          gcp_view_units: 0
        },
        // ... more configurations
      ]
    }
  ],

  payment_plans_detailed: [
    {
      name: "20:80 Developer Subvention",
      structure: "20% on booking, 80% on OC",
      interest_bearer: "Developer",
      applicable_towers: ["D", "E", "F"],
      bank_partners: []
    }
    // ... more plans
  ],

  gcp_details: {
    distance_from_project_m: 600,
    total_area_acres: 20,
    lake_area_acres: 3,
    jogging_track_m: 750,
    trees_planted: 3500,
    themed_gardens: ["Mughal Garden", "Japanese Zen Garden", "Moroccan Garden", "Chinese Garden"],
    unique_features: ["X-Bridge", "Zip Line", "Splash Pad", "Amphitheater"]
  },

  amenities_detailed: [
    {
      name: "Swimming Pool",
      location: "Ecodeck",
      size: "50m x 25m (Olympic)",
      status: "Under Construction",
      unique_feature: "Olympic length",
      vs_competitor: "Larger than Dosti 25m, Lodha Amara 25m"
    }
    // ... more amenities
  ]
}
```

### 3. Enhanced `brands.metadata` Schema

Add township-level shared data:

```
metadata: {
  // EXISTING
  developer: {...},
  mql_schema: "kalpataru",

  // NEW: Township Overview
  township: {
    name: "Kalpataru Parkcity",
    total_area_acres: 108,
    total_towers: 27,
    total_units: 7823,
    launch_date: "2013-10",
    phases: ["Estella", "Primera", "Immensa", "Eternia", "Sunrise"],
    shared_amenities: {
      gcp: {
        area_acres: 20,
        development_cost_cr: 90,
        ownership: "Public park developed by Kalpataru"
      },
      retail_plaza: { size_sqft: 200000, status: "Partially operational" },
      school: { board: "ICSE", status: "Planned" }
    }
  },

  // NEW: Location Metadata
  location_master: {
    address: "Kolshet Road, Thane West, 400607",
    connectivity: {
      metro_line_4: { station: "Kapurbawdi", distance_km: 2.1, status: "Under Construction", completion: 2027 },
      metro_line_5: { station: "Thane-Bhiwandi", distance_km: 3, status: "Under Construction", completion: 2028 },
      railway: { station: "Thane Central", distance_km: 7, time_min: 25 },
      highways: [
        { name: "Eastern Express Highway", distance_km: 2.2, time_min: 6 },
        { name: "Ghodbunder Road", distance_km: 3, time_min: 10 }
      ]
    },
    social_infra: {
      hospitals: [
        { name: "Jupiter Hospital", distance_km: 3.3, rating: "9/10" },
        { name: "Hiranandani Hospital", distance_km: 3.5, rating: "9/10" }
      ],
      schools: [
        { name: "Poddar International", distance_km: 3.9, board: "ICSE", fees: "1.5-2L/year" }
      ],
      malls: [
        { name: "Lakeshore Mall (Viviana)", distance_km: 3.7 }
      ]
    },
    market_dynamics: {
      avg_psf: 19400,
      price_appreciation_3y: "28%",
      rental_yield_2bhk: "4%",
      avg_rent_2bhk: "20000-25000"
    }
  }
}
```

---

## Sister Projects Data Structure

### Primera (Cross-sell for budget-conscious)

```json
{
  "id": "primera_parkcity_thane",
  "parent_project_id": "eternia_parkcity_thane",
  "name": "Primera",
  "brand_id": "kalpataru",
  "relationship_type": "township_sister",
  "metadata": {
    "total_area_acres": 2.44,
    "towers": 2,
    "total_units": 619,
    "launch_date": "2024-04",
    "rera_possession": "2029-12",
    "pricing": {
      "base_psf_min": 14500,
      "base_psf_max": 15000,
      "gcp_premium_psf": 300
    },
    "configurations": [
      { "type": "2 BHK", "carpet_sqft": [400, 499], "price_cr": [0.91, 1.05] },
      { "type": "2 BHK", "carpet_sqft": [600, 700], "price_cr": [1.34, 1.54] }
    ],
    "inventory_available": {
      "2bhk_compact": 303,
      "2bhk_large": 247
    },
    "payment_plan": "20:80 Bank Subvention (ICICI)",
    "gcp_distance_m": null,
    "unique_selling": "Entry-level pricing in Parkcity township"
  },
  "cross_sell_triggers": {
    "budget_below_cr": 1.6,
    "config_preference": ["2 BHK"],
    "possession_flexibility": true,
    "talking_point": "Same township benefits at 10% lower entry point"
  }
}
```

### Estella (Cross-sell for upcoming launch / GCP views)

```json
{
  "id": "estella_parkcity_thane",
  "parent_project_id": "eternia_parkcity_thane",
  "name": "Estella",
  "metadata": {
    "total_area_acres": 12.11,
    "towers": 8,
    "launched_towers": 2,
    "total_units": 608,
    "launch_date": "2025-07",
    "rera_possession": "2031-01",
    "pricing": {
      "base_psf": 14800,
      "gcp_premium_psf": 1000
    },
    "configurations": [
      { "type": "2 BHK", "carpet_sqft": [700, 799], "price_cr": [1.49, 1.74] },
      { "type": "3 BHK", "carpet_sqft": [900, 999], "price_cr": [1.97, 2.39] },
      { "type": "3 BHK", "carpet_sqft": [1100, 1200], "price_cr": [2.37, 2.71] }
    ],
    "inventory_available": {
      "2bhk": 205,
      "3bhk_standard": 162,
      "3bhk_large": 147
    },
    "gcp_units": 134,
    "payment_plan": "20:80 Bank Subvention + Zero SDR, Yearly Payment Plan",
    "unique_selling": "Fresh launch, maximum GCP-facing inventory"
  },
  "cross_sell_triggers": {
    "wants_gcp_view": true,
    "config_preference": ["3 BHK"],
    "investment_buyer": true,
    "talking_point": "New launch pricing with direct GCP views"
  }
}
```

### Immensa (Cross-sell for RTMI / 4BHK seekers)

```json
{
  "id": "immensa_parkcity_thane",
  "parent_project_id": "eternia_parkcity_thane",
  "name": "Immensa",
  "metadata": {
    "total_area_acres": 7,
    "towers": 8,
    "total_units": 1492,
    "launch_date": "2016-04",
    "oc_received": ["G", "H"],
    "oc_date": "2026-03-16",
    "configurations": [
      { "type": "4 BHK", "carpet_sqft": [1700, 1799], "price_cr": [4.48, 4.86], "sold": 135, "available": 28 },
      { "type": "4 BHK", "carpet_sqft": [1900, 2100], "price_cr": [5.20, 5.69], "available": 2 }
    ],
    "inventory_available": {
      "4bhk_standard": 28,
      "4bhk_large": 2
    },
    "all_gcp_facing": true,
    "payment_plan": "20:80 Developer Subvention",
    "unique_selling": "OC received, Ready to Move In, All GCP-facing"
  },
  "cross_sell_triggers": {
    "needs_rtmi": true,
    "config_preference": ["4 BHK"],
    "budget_above_cr": 4.5,
    "decision_timeline_urgent": true,
    "talking_point": "Ready possession 4BHK with direct park views"
  }
}
```

---

## Enhanced Competitor Data

Update `projects.metadata.competitors` array with:

1. **New Competitors**:
   - Adani Codename LIT (Teen Hath Naka, ₹25,000/sqft)
   - Hiranandani Westgate (Ghodbunder Road, ₹23,000-28,000/sqft)
   - Runwal 25 Hour Life (Manpada, ₹17,500-18,500/sqft)
   - Purva Panorama Oak (Ghodbunder Road, ₹20,000-21,000/sqft)

2. **Enhanced Pricing Data** per competitor:
   - Multiple configurations with exact carpet areas
   - Price ranges (min/max) per configuration
   - Current payment plans and offers
   - Sales velocity and inventory status

---

## Code Changes Required

### 1. Database Migration

Create the `sister_projects` table with appropriate RLS policies.

### 2. Update analyze-leads Edge Function

Modify `buildStage2Prompt()` to include:
- Sister project inventory for cross-selling suggestions
- Enhanced competitor pricing matrix with new competitors
- Township-level context from brand metadata

Add new output field:
```json
{
  "cross_sell_recommendation": {
    "recommended_project": "Immensa" | "Primera" | "Estella" | null,
    "reason": "RTMI requirement matches Immensa 4BHK inventory",
    "talking_point": "Ready possession 4BHK with direct park views at ₹4.5Cr"
  }
}
```

### 3. Update Frontend Components

- Add cross-sell recommendation display to LeadCard/LeadReportModal
- Show sister project options when applicable

---

## Data Population Approach

Rather than hardcoding all data in migrations, I recommend:

1. **Initial database insert** with structured metadata from the Excel
2. **Future updates** via a simple admin interface or direct SQL updates

The Excel file will be parsed and transformed into the JSONB structures above.

---

## Summary of Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `sister_projects` table | New | Store Primera, Estella, Immensa for cross-selling |
| `brands.metadata` | Enhanced | Add township overview, location master |
| `projects.metadata` | Enhanced | Add technical specs, tower inventory, amenities |
| `projects.metadata.competitors` | Enhanced | Add 4 new competitors, detailed pricing |
| analyze-leads edge function | Modified | Add cross-sell logic, enhanced competitor matrix |
| LeadCard/LeadReportModal | Modified | Display cross-sell recommendations |

---

## Technical Considerations

1. **RLS Policies**: The `sister_projects` table will use the same `is_approved_domain_user()` function for read access
2. **Data Freshness**: Tower inventory data (sold/unsold) should be refreshed periodically
3. **Query Efficiency**: Sister projects are queried once per analysis batch, not per lead
4. **Backwards Compatibility**: All existing functionality preserved; new fields are additive
