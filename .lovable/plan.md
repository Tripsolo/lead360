
# Plan: Expand `normalizePersona()` Coverage (Patch 3)

## Problem

The current `normalizePersona()` function (lines 1688-1733) handles only 13 basic patterns. Stage 2 (Claude Opus) generates freeform persona labels like "Corporate Professional", "Growing Family", "IT Professional", "Young Couple", "Doctor", "Overseas Buyer", etc. These fall through to the default "Aspirant Upgrader", causing ~30-40% of leads to receive generic, irrelevant talking points.

## Changes

### File: `supabase/functions/analyze-leads/nba-framework.ts`

**Replace the `normalizePersona()` function body (lines 1688-1733)** with the patch-provided version that:

**1. Expands existing patterns with more keywords:**

| Existing Persona | New Keywords Added |
|---|---|
| Lifestyle Connoisseur | `luxury`, `hni`, `high net worth` |
| Asset-Locked Upgrader | `sop`, `sale of property` |
| Settlement Seeker | `retired`, `senior citizen` |
| Business Owner | `entrepreneur`, `self-employed`, `proprietor` |
| Kalpataru Loyalist Upgrader | `existing customer` |
| Parkcity Rental Converter | `immensa rental` |
| NRI/Out-of-City Relocator | `overseas`, `abroad`, `gulf`, `dubai`, `expat` |

**2. Fixes ordering bugs:**
- Moves `first-time investor` check AFTER `pragmatic investor` (currently it's unreachable at line 1724 because `investor` match on line 1706 catches it first)
- Adds generic `investor`/`investment` catch-all after specific investor types
- Separates `senior citizen self-use` (requires both "senior" + "self-use") from `retired`/`senior citizen` (now maps to Settlement Seeker)

**3. Adds new medium-priority freeform label mappings:**

| Stage 2 Output Pattern | Maps To |
|---|---|
| `growing family`, `young couple`, `couple with`, `family` | Lifestyle Connoisseur |
| `corporate`, `professional`, `executive`, `manager`, `mid-career` | Aspirant Upgrader |
| `upgrade`, `upgrader`, `seeker` | Aspirant Upgrader |
| `first-time buyer`, `first home`, `first time` | First-Time Investor |
| `doctor`, `healthcare`, `medical` | Lifestyle Connoisseur |
| `trader`, `merchant`, `industrialist` | Business Owner |

**4. Adds monitoring:**
- `console.warn` on default fallback to log unmapped personas for future coverage expansion

## Ordering Strategy

The patch follows a strict priority order:
1. **Highest priority** -- Direct matrix persona matches (Lifestyle Connoisseur, Asset-Locked, Vastu, Settlement, Investors, Business Owner, Amara, Loyalist, Parkcity, NRI, Senior Self-Use)
2. **Medium priority** -- Common freeform labels (family-oriented, professional/corporate, upgrade-focused, first-time buyers, healthcare, business-related)
3. **Default fallback** -- Aspirant Upgrader with console.warn

## No other files changed

This is a self-contained change to a single function in `nba-framework.ts`. The function signature and return types remain identical.
