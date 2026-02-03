
# Knowledge Base Field Explainer & Database Schema Update Plan

## Executive Summary

This plan addresses three interconnected objectives:
1. **Create a Knowledge Base Field Explainer** - A comprehensive guide for LLM extraction of technical and multi-variant fields from project metadata
2. **Ingest missing data** - Add unit-level inventory with closing prices, tower-level OC dates, and competitor pricing to the database
3. **Update prompts** - Integrate the Knowledge Base Field Explainer into Stage 2, Stage 2.5, and Stage 3 prompts

---

## Part 1: Knowledge Base Field Explainer

### Fields Identified for Inclusion

The following fields are either technical or have multiple variants in the knowledge base, requiring explicit extraction guidelines:

#### 1. Pricing Fields (CRITICAL - Multiple Variants)

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `closing_price_total_value_cr` | Unit Inventory (Page 6) | All-inclusive price quoted to customer. Includes: Base + Floor Rise + Facing Premium + GST + Stamp Duty. | **PRIMARY for budget comparison.** Use this for cross-sell and budget gap calculations. |
| `closing_price_agreement_value_cr` | Unit Inventory (Page 6) | Agreement value (pre-stamp duty/registration). | Use only if total value unavailable. |
| `sourcing_price_total_value_cr` | Unit Inventory (Page 6) | Developer's sourcing cost (Total Value). | Internal use only - never quote to customer. |
| `sourcing_price_agreement_value_cr` | Unit Inventory (Page 6) | Developer's sourcing cost (Agreement Value). | Internal use only. |
| `base_psf` | Project Metadata | Base price per square foot (before premiums). | For PSF comparisons with competitors. |
| `gcp_premium_psf` | Project Metadata | Additional PSF for Grand Central Park-facing units. | Factor into total when customer wants GCP view. |
| `high_floor_premium_psf` | Project Metadata | Per-floor premium (e.g., Rs 100/floor). | Factor into total for high-floor preferences. |

**Extraction Rule:** When comparing customer budget against project pricing, ALWAYS use `closing_price_total_value_cr` (min/max range for the matching typology). Never use base PSF * carpet area as a proxy.

#### 2. Possession/OC Date Fields (CRITICAL - Multiple Variants)

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `oc_date` | Unit Inventory (Page 6) | **Actual expected possession date** per tower. Format: DD-MMM-YY or MMM-YY. | **PRIMARY for possession timeline matching.** Use this for customer expectation alignment. |
| `rera_possession` | Project Metadata | Regulatory deadline from RERA registration. | DO NOT use for customer timeline. Only for compliance reference. |
| `oc_received` | Project Metadata (array) | Towers that have already received OC. | If tower in this array, mark as RTMI (Ready-to-Move-In). |
| `current_construction_status` | Unit Inventory (Page 6) | Text describing progress (e.g., "32nd Slab - Complete", "OC Received"). | Use for construction progress evidence. |
| `current_due` | Unit Inventory (Page 6) | Percentage of construction-linked payments due. | Indicates construction progress (higher % = closer to completion). |

**Extraction Rule:** The hierarchy is: `oc_received` (if present, unit is RTMI) > `oc_date` (actual expected) > `rera_possession` (regulatory only). Never tell a customer their possession is based on RERA date.

#### 3. Inventory Structure Fields

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `typology` | Unit Inventory | Config type: 1 BHK, 2 BHK, 2.5 BHK, 3 BHK, 4 BHK | Match to customer's config interest. |
| `carpet_area_sqft` | Unit Inventory | Carpet area range in sqft (e.g., "600-699"). | Match to customer's carpet area preference. |
| `car_parking` | Unit Inventory | Parking type: Single, Tandem, Double. | Note: Tandem = 2 cars stacked. |
| `total_inventory` | Unit Inventory | Total units of this typology in tower. | For availability context. |
| `unsold` | Unit Inventory | Currently available units. | For urgency/scarcity messaging. |
| `units_with_gcp_view` | Unit Inventory | Count of units facing Grand Central Park. | For GCP preference matching. |
| `view` | Unit Inventory | View type: "Grand Central Park", "Creek View", or blank. | For view preference matching. |

#### 4. Township & Shared Asset Fields

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `gcp_access` | Brand Metadata | All Parkcity projects share access to Grand Central Park (20.5 acres). | Mention for all sister projects - shared township benefit. |
| `total_project_area` | Project Metadata | Total township acreage. | 108 acres total for Parkcity. |
| `retail_plaza` | Project Metadata | Commercial retail within township. | "Retail taking shape" talking point. |
| `township_components` | Brand Metadata | Includes: Retail, Residential, Office Space, School, Temple. | For township ecosystem pitch. |
| `entry_exit_points` | Brand Metadata | Number of access points (4 for Parkcity). | For connectivity pitch. |

#### 5. Connectivity & Location Fields

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `metro_line_4_status` | Location Metadata | Under Construction, target 2027. | "5 min walk post-metro" pitch. |
| `metro_line_5_status` | Location Metadata | Under Construction, target 2028. | Bhiwandi connectivity. |
| `distance_to_bkc` | Location Metadata | 26.6 km, 50 min current / 35 min post-metro. | For corporate professional pitch. |
| `distance_to_tcs` | Location Metadata | 3.7 km - Walk-to-Work employer. | For IT professional targeting. |
| `school_proximity` | Location Metadata | Poddar International (3.9 km), Singhania (4.1 km). | For family buyer pitch. |
| `hospital_proximity` | Location Metadata | Jupiter (3.3 km), Hiranandani (3.5 km). | For senior/healthcare pitch. |

#### 6. Competitor Reference Fields

| Field Name | Source | Definition | Usage Rule |
|------------|--------|------------|------------|
| `competitor.price_min_av` | Competitor Metadata (Page 8) | Competitor's minimum Agreement Value for config. | For price comparison. |
| `competitor.avg_psf` | Competitor Metadata (Page 8) | Competitor's average PSF (carpet). | For PSF comparison. |
| `competitor.vs_eternia` | Competitor Metadata (Page 8) | Comparison note (e.g., "Cheaper 25%"). | For positioning. |
| `competitor.key_weakness` | Competitor Metadata (Page 8) | Strategic weakness (e.g., "High density 40+ towers"). | For objection handling. |

---

## Part 2: Database Schema Updates

### A. New Table: `tower_inventory`

Store unit-level inventory with closing prices per tower/typology.

```text
tower_inventory
+------------------+----------+--------------------------------------+
| Column           | Type     | Description                          |
+------------------+----------+--------------------------------------+
| id               | uuid     | Primary key                          |
| project_id       | text     | FK to projects.id                    |
| tower            | text     | Tower identifier (A, B, C, etc.)     |
| floors           | integer  | Number of floors                     |
| units_per_floor  | integer  | Units per floor                      |
| current_due_pct  | numeric  | Construction-linked payment %        |
| construction_status | text  | Current construction status          |
| oc_date          | date     | Expected OC date                     |
| typology         | text     | 1 BHK / 2 BHK / 2.5 BHK / 3 BHK / 4 BHK |
| car_parking      | text     | Single / Tandem / Double             |
| carpet_sqft_min  | integer  | Minimum carpet area                  |
| carpet_sqft_max  | integer  | Maximum carpet area                  |
| total_inventory  | integer  | Total units                          |
| sold             | integer  | Sold units                           |
| unsold           | integer  | Available units                      |
| gcp_view_units   | integer  | Units with GCP view                  |
| view_type        | text     | Grand Central Park / Creek View      |
| sourcing_min_cr  | numeric  | Min sourcing price (Total Value)     |
| sourcing_max_cr  | numeric  | Max sourcing price (Total Value)     |
| closing_min_cr   | numeric  | Min closing price (Total Value)      |
| closing_max_cr   | numeric  | Max closing price (Total Value)      |
| created_at       | timestamp| Creation timestamp                   |
| updated_at       | timestamp| Update timestamp                     |
+------------------+----------+--------------------------------------+
```

### B. New Table: `competitor_pricing`

Store configuration-wise competitor pricing.

```text
competitor_pricing
+------------------+----------+--------------------------------------+
| Column           | Type     | Description                          |
+------------------+----------+--------------------------------------+
| id               | uuid     | Primary key                          |
| competitor_name  | text     | Developer name                       |
| project_name     | text     | Project name                         |
| config           | text     | 1 BHK / 2 BHK / 3 BHK / 4 BHK        |
| carpet_sqft_min  | integer  | Minimum carpet area                  |
| carpet_sqft_max  | integer  | Maximum carpet area                  |
| price_min_av     | numeric  | Min Agreement Value (in lakhs)       |
| price_max_av     | numeric  | Max Agreement Value (in lakhs)       |
| avg_psf          | numeric  | Average PSF (carpet)                 |
| payment_plans    | text     | Available payment plans              |
| vs_eternia       | text     | Comparison note                      |
| availability     | text     | High / Medium / Low                  |
| sample_flat      | boolean  | Sample flat available                |
| last_updated     | date     | Last price update date               |
| created_at       | timestamp| Creation timestamp                   |
+------------------+----------+--------------------------------------+
```

### C. Update `sister_projects.metadata`

Update existing `price_cr` fields to `closing_price_cr` with clarification that these are all-inclusive closing prices.

---

## Part 3: Prompt Integration

### Stage 2 (Scoring & Persona)

Add the Knowledge Base Field Explainer as a new constant `knowledgeBaseFieldExplainer` and include it in the system prompt:

```typescript
const knowledgeBaseFieldExplainer = `# KNOWLEDGE BASE FIELD EXPLAINER

This section explains how to interpret fields from project metadata, sister projects, 
and inventory data. Follow these rules strictly for accurate analysis.

## PRICING FIELDS (CRITICAL)
...
[Full content as defined above]
`;
```

Include in Stage 2 prompt:
- After `mqlFieldExplainer`
- Before `leadScoringModel`

### Stage 2.5 (Cross-Sell Recommendation)

Update `buildCrossSellPrompt()` to:
1. Pass `knowledgeBaseFieldExplainer` as context
2. Reference `closing_price_cr` (not `price_cr`) for budget comparison
3. Include tower-level OC dates from inventory

### Stage 3 (NBA & Talking Points)

Update `buildStage3Prompt()` in `nba-framework.ts` to:
1. Include `knowledgeBaseFieldExplainer` 
2. Reference inventory availability for urgency messaging
3. Use competitor pricing for specific rebuttals

---

## Part 4: Implementation Steps

### Phase 1: Database Schema (Migration)
1. Create `tower_inventory` table with RLS policies
2. Create `competitor_pricing` table with RLS policies
3. Add indexes for efficient querying

### Phase 2: Data Ingestion
1. Parse Page 6 (Unit Inventory) and insert into `tower_inventory`
2. Parse Page 8 (Competitor Pricing) and insert into `competitor_pricing`
3. Update `sister_projects.metadata` with corrected field names

### Phase 3: Edge Function Updates
1. Create `knowledgeBaseFieldExplainer` constant in `analyze-leads/index.ts`
2. Fetch `tower_inventory` data for the project
3. Fetch `competitor_pricing` data for the micro-market
4. Update Stage 2, Stage 2.5, and Stage 3 prompts to include the explainer
5. Update cross-sell logic to use `closing_price_cr` from inventory

### Phase 4: Testing
1. Re-analyze sample leads to verify correct field usage
2. Validate cross-sell recommendations use correct closing prices
3. Verify possession timeline matching uses OC dates not RERA dates

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/analyze-leads/index.ts` | Add `knowledgeBaseFieldExplainer` constant, update Stage 2 prompt, update cross-sell prompt to fetch inventory data |
| `supabase/functions/analyze-leads/nba-framework.ts` | Add `knowledgeBaseFieldExplainer` to Stage 3 prompt context |
| Database | Create `tower_inventory` and `competitor_pricing` tables via migration |

### Data Volume

From Page 6 analysis:
- **Eternia**: ~30 tower/typology combinations
- **Estella**: ~6 tower/typology combinations  
- **Primera**: ~4 tower/typology combinations
- **Immensa**: ~4 tower/typology combinations
- **Total**: ~44 inventory records to ingest

From Page 8:
- **Competitors**: 14 projects with ~80 configuration-wise pricing records

---

## Expected Outcomes

1. **Accurate Budget Comparisons**: Cross-sell and scoring will use closing prices (all-inclusive) rather than base price estimates
2. **Correct Possession Matching**: OC dates per tower will drive RTMI recommendations
3. **Specific Competitor Rebuttals**: NBA/Talking Points will reference exact competitor pricing
4. **Consistent Field Interpretation**: All three stages will use the same field definitions
