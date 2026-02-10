# Stage 3 Variant: Scenario-Driven NBA/TP Generation

## Architecture Overview

The new Stage 3 variant ("scenario-driven") runs **in parallel** with the existing Stage 3 ("matrix-driven") as an A/B test. Both variants:
- Receive the **same inputs** from Stages 1 & 2
- Produce the **same output schema** (talking_points[], next_best_action{})
- Are stored in `full_analysis` with a `stage3_variant` field for comparison

### Key Difference

| Aspect | Current (Matrix-Driven) | New (Scenario-Driven) |
|--------|------------------------|----------------------|
| Primary key | Persona × Objection matrix | Customer scenario (what's happening) |
| TP selection | Deterministic lookup → TP-IDs → contextualize | LLM reads playbook + KB → generates arguments |
| NBA selection | Pre-selected NBA-ID from matrix | LLM reasons about goal → generates strategic action |
| Grounding | 43 static TP definitions | Source playbook (39 scenarios) + live KB data |
| LLM role | Contextualize pre-selected templates | Reason creatively within strategic guardrails |

### What stays the same (no changes to Stages 1, 2, 2.5)

- Stage 1: Signal extraction (Gemini 3 Flash) — unchanged
- Stage 2: Scoring, persona, concerns (Claude Sonnet) — unchanged
- Stage 2.5: Cross-sell (Gemini 3 Flash) — unchanged
- Stage 4: Evaluator — minor: skip TP-ID validation for scenario variant

### Stage 2 output already provides everything the new variant needs

The scenario variant needs from Stage 2:
- `persona` ✓ (already output)
- `primary_concern_category` ✓ (already output)
- `concern_categories` ✓ (already output)
- `key_concerns` ✓ (already output)
- `extracted_signals` ✓ (already output)
- `pps_score` / `ai_rating` ✓ (already output)

No Stage 2 changes required.

---

## File Changes Required

### 1. New file: `nba-scenario-framework.ts`

Contains:
- `OBJECTION_PLAYBOOK` constant (cleaned source file as markdown)
- `buildStage3ScenarioPrompt()` function
- Safety check reuse from existing `checkSafetyConditions()`

### 2. Modified file: `index.ts`

Changes:
- Import new `buildStage3ScenarioPrompt` function
- Add `stage3_variant` selection logic (A/B test flag or config)
- Route to appropriate Stage 3 builder
- Store `stage3_variant: "matrix" | "scenario"` in analysis result

### 3. Modified file: `evaluator.ts` (minor)

Changes:
- When `stage3_variant === "scenario"`, skip TP-ID existence validation
- Keep all other validations (factual accuracy, KB number checks)

---

## Implementation: `nba-scenario-framework.ts`

```typescript
// ============= SCENARIO-DRIVEN NBA & TALKING POINTS FRAMEWORK =============
// Alternative to persona-objection matrix approach
// Uses source playbook as LLM grounding context + live KB data

import { checkSafetyConditions, getNBARuleDef, type NBAActionType } from "./nba-framework.ts";

// ============= CLEANED OBJECTION HANDLING PLAYBOOK =============
// Source: Kalpataru Parkcity Sales Team Excel
// 39 scenario-NBA pairs across 7 categories
// Lightly cleaned: fixed typos, consistent formatting, preserved strategic tone

export const OBJECTION_PLAYBOOK = `
# OBJECTION HANDLING & NEXT BEST ACTION PLAYBOOK
## Strategic Guidance for Sales Conversations

---

### 1. ECONOMIC FIT (Financial & Budget)

**Pricing Gap Vs Perceived Value**

SCENARIO: Wants RTMI at Under Construction price
GUIDANCE: Show value of money earned by buying UC at lower price and investing the difference. Show choice of inventory — house is bought for the family who will stay there, so show value of improved lifestyle by going UC. Show savings from relaxed payment schedule vs RTMI for interiors.

SCENARIO: Getting cheaper at competition (value perception mismatch, not cash shortage)
GUIDANCE: Show lifestyle comparison for self and family depending on family structure. Highlight the gentry the client will share the development with and its impact on their children and social circle. Show future growth of the area and how micro-market development drives appreciation. Highlight key negatives of competition: MLCP issues, Lower Income Group as residents, families per sqft of development, planning details that make your project more valuable.

SCENARIO: Getting better location at similar budget
GUIDANCE: Challenge definition of 'better location' — established location has peaked and will never see similar appreciation or infra development. Show neutral data about how your micro-market will be the city's next focus area. Explain what the other micro-market actually provides vs what your development gives — they charge for the established name, you give actual value.

**Payment Schedule**

SCENARIO: Wants subvention without cost loading
GUIDANCE: Don't say flat no. Discuss client's financial flow first, then suggest cheaper option via payment schedule or bullet plan post management approval. Explain developer business model — impossible to give without cost. Show how missing out on a home that fits all requirements just for subvention doesn't make sense. Suggest payment deviations and structured schedule for ease.

SCENARIO: CLP deviation making price beyond budget / too much due at booking
GUIDANCE: Suggest lower floor to cover deviation cost OR cheaper option in project. DO this face-to-face with pre-approved strategy from management. Show value of what client is buying vs requirements and price appreciation at later stage vs current pricing. Compare with competition pricing at similar deviations.

**Cashflow/EMI Stress**

SCENARIO: OCR contribution issue
GUIDANCE: Suggest micro-finance products. Suggest payment schedules like bullet or structured plan based on income cycle and appraisal hikes. 0 stamp duty offer post discussion with management for lower OCR.

SCENARIO: Loan eligibility issue
GUIDANCE: Try alternate banks or NBFCs via banker. Suggest builder subvention with loading, showing property value and future price to justify.

SCENARIO: CSOP (Current Sale of Property) required
GUIDANCE: Suggest bank/builder subvention or customized payment deviations for CSOP timelines. Introduce a KL broker who can help sell the property faster AND gives us control and visibility of what's happening with CSOP.

---

### 2. POSSESSION TIMELINE

**Immediate Need (RTMI)**

SCENARIO: Staying on rent, can't afford EMI and rent both
GUIDANCE: Show exact working of rent paid vs price saving from transacting now vs RTMI. Add property appreciation and lifestyle value for entire family. Compare with cost of staying on rent. Suggest builder/bank subvention with: (1) Subvention benefit, (2) Inventory choice advantage, (3) Infra/amenity cost inbuilt in RTMI vs UC.

SCENARIO: House sold, sitting on capital gains
GUIDANCE: Show value of buying UC at current price for later possession. Suggest investment into govt bonds to save capital gain (discuss with CA). Show rent paid till possession vs what client is buying and benefits at possession — don't short-sell just to save capital gain amount.

**Long-Term Fatigue / Fear of Delay**

SCENARIO: Possession too late (e.g. 2030)
GUIDANCE: Highlight: (1) Inventory choice advantage, (2) Price lock now, (3) Sooner possession inventory options, (4) Subvention = risk taken by developer. Show: construction updates/videos, CC/OC received towers walkthrough with unit count, happy customer testimonials, events showcase (e.g. Immensa Clubhouse), retail taking shape. Investment angle: lower entry price today = higher appreciation by possession.

SCENARIO: Developer delay belief / construction behind timeline
GUIDANCE: Show projected vs actual construction timelines taken at year start. Highlight it's hearsay and project is actually on track. Share happy customer testimonies (personal experience, delivered unit tour, video testimonial). Highlight prominent names in micro-market who delayed but remain trusted (shows delays aren't unique to us). Emphasize quality and planning difference vs competition.

---

### 3. INVENTORY & PRODUCT

**Layout / Size**

SCENARIO: Space perception — rooms feel small
GUIDANCE: Upgrade pitch: Move to 783 sqft (Estella) if budget allows. Zero-wastage explanation vs competitor wasted space. "Outdoor Room" concept: balcony/deck as extended living space.

SCENARIO: Need unit with deck (budget or usable area concern)
GUIDANCE: Option A: Pitch deck unit with aggressive payment to cover deck cost. Break down house cost vs deck cost separately. Show larger non-deck unit as alternative at same price. Option B: Aggressive payment for preferred size+deck. Show larger unit without deck for the family upgrade.

SCENARIO: Bigger carpet area needed, not interested in jodi, wants builder finish
GUIDANCE: Share jodi layout with customization possibilities. Show benefits of jodi vs builder finish. Share market availability of that size and price comparison vs jodi total outflow including making charges.

**View Preference**

SCENARIO: Want clear views, no building in front
GUIDANCE: Compare price of building-front unit vs GCP/creek facing. Share exact gap between buildings. Explain KL's wind and sunlight analysis ensuring basics despite building in sight.

SCENARIO: Privacy top priority
GUIDANCE: Compare price of building-front vs open view. Share exact gap between buildings. Show exact positioning of units for privacy comfort.

**Floor Preference**

SCENARIO: Certain floor required for views or current residence match
GUIDANCE: Share aggressive payment schedule to cover floor rise. Show how price justifies views at preferred floor vs lower floors.

**Ventilation & Lighting**

SCENARIO: Rooms not getting enough sunlight/ventilation
GUIDANCE: Highlight unit benefits beyond the one concern. Offer bareshell unit post management approval where client can reconfigure (wet areas fixed, living/bedroom flexible).

**Vastu Compliance**

SCENARIO: Room direction or house entry direction concern
GUIDANCE: Suggest changes client can make OR KL can make post management approval. Highlight vastu-compliant aspects and positive family impact. Share vastu consultant remedies. Show how entry direction can be changed by developer.

**Amenities**

SCENARIO: Desired amenities unavailable
GUIDANCE: Show cluster-wise amenities: Eternia/Estella/Primera. Compare amenities per resident ratio. Show size and span of amenity spaces.

---

### 4. LOCATION & ECOSYSTEM FIT

**Connectivity / Commute Concern**

SCENARIO: Want convenience for work/school/highway
GUIDANCE: Share upcoming infra for project location. Show connectivity improvements inside Thane and to other areas. Establish: house is once-in-lifetime purchase — see long-term lifestyle benefit + future infra, not short-term convenience only.

SCENARIO: Ecosystem rebuild — far from current location
GUIDANCE: Share upcoming infra and connectivity. Show self-sustaining township addresses ecosystem needs. Highlight long-term lifestyle benefit for the family.

SCENARIO: Vicinity too congested / didn't like vicinity
GUIDANCE: Highlight: (1) 4 entry/exit points for traffic dispersal, (2) Self-sustaining township reduces outside travel, (3) Metro + road connectivity improvements.

**Perceived Value of Location**

SCENARIO: Price for location seems low vs other micro-markets
GUIDANCE: Share price trends showing established markets have peaked. Show scope of growth in your micro-market due to scale of development.

---

### 5. COMPETITION (Explicit Competitor Mention)

SCENARIO: Competitor delivered, can see finished product
GUIDANCE: Highlight your project's planning and post-delivery look via walkthrough. Show scale and quality difference. Especially highlight density: family per sqft advantage. Show price advantage.

SCENARIO: Competitor has better delivery track record
GUIDANCE: Share your delivery timelines and current construction stage. Show price + quality client gets vs competition.

SCENARIO: Competitor has better layouts/area sizes/decks at lower price
GUIDANCE: Highlight layout benefit closest to client's needs. Show total value: what client gets vs price paid and how it benefits the family.

SCENARIO: Competitor has lower/no payment loading
GUIDANCE: Highlight DELAY RISK — builder must raise debt or self-fund if not taking from clients. Feels lucrative now but project stands at HIGH RISK for completion.

SCENARIO: Competitor location perceived more premium
GUIDANCE: Share upcoming infra for project location. Show connectivity improvements. Establish long-term lifestyle benefit vs short-term location perception.

---

### 6. INVESTMENT & SPECIAL BEHAVIORS

SCENARIO: Rental yield, ROI focus — rational investor behavior
GUIDANCE: (1) Kolshet better returns — Anarock report, (2) Sunrise/RTMI rental data, (3) Infra developments for further price appreciation, (4) Self-sustaining independent township: retail/resi/office space/school/temple with multiple access points, (5) Why RE investment is good: capital gains, price lock with payment plan.

---

### 7. DECISION PROCESS

SCENARIO: Will visit all competition first before deciding
GUIDANCE: Highlight current OFFERS — client WILL MISS OUT. Set up meeting for competition comparison. Push closure — OFFER WON'T BE APPLICABLE if they take time.

SCENARIO: Not sure on exact area requirement
GUIDANCE: Work with client: family size → reason for buying → sync with budget and cash flows → zero down exact area.

SCENARIO: Not sure of budget, just started scouting
GUIDANCE: Work with client: family size → reason for buying → sync with budget and cash flows → right configuration.

SCENARIO: Family disagrees on location
GUIDANCE: Why Thane > Kolshet > Parkcity: connectivity and upcoming infra. Highlight current offers — will miss out. Push for closure.

SCENARIO: Looking on behalf of someone else
GUIDANCE: Emphasize offer and unit might not be available when decision maker comes. Push for site visit or VC. Push for CLOSURE to lock price and exact unit.

SCENARIO: Need to bring parents/influencers to decide
GUIDANCE: Emphasize offer and unit scarcity. Push for site visit or VC for influencers. Push for CLOSURE to lock price and exact unit.

SCENARIO: Want to see actual unit/site before deciding
GUIDANCE: Site visit only possible once TOKEN is given. Push for closure to get price and unit benefit. Then take client to project/unit.
`;

// ============= SCENARIO-DRIVEN STAGE 3 PROMPT BUILDER =============

/**
 * Build Stage 3 prompt using scenario-driven approach
 * Instead of persona-objection matrix lookup, passes:
 * 1. Full playbook as strategic grounding
 * 2. Live KB data (tower inventory, competitor pricing)
 * 3. Lead context (signals, persona, concerns)
 * And lets the LLM reason about the best approach
 */
export function buildStage3ScenarioPrompt(
  stage2Result: any,
  extractedSignals: any,
  visitComments: string,
  towerInventory?: any[],
  competitorPricing?: any[],
  projectMetadata?: any
): string {
  // Check safety conditions (reuse from matrix framework)
  const safetyCheck = checkSafetyConditions(stage2Result?.persona || "Unknown", extractedSignals);
  
  // Extract key lead context
  const persona = stage2Result?.persona || "Unknown";
  const primaryConcern = stage2Result?.primary_concern_category || null;
  const concernCategories = stage2Result?.concern_categories || [];
  const keyConcerns = stage2Result?.key_concerns || [];
  const rating = stage2Result?.ai_rating || "Unknown";
  const ppsScore = stage2Result?.pps_score || null;
  
  const budgetStated = extractedSignals?.financial_signals?.budget_stated_cr || null;
  const budgetGap = extractedSignals?.financial_signals?.budget_gap_percent || null;
  const customerMentionedPriceHigh = extractedSignals?.financial_signals?.customer_mentioned_price_high || false;
  const carpetDesired = extractedSignals?.property_preferences?.carpet_area_desired || null;
  const configInterested = extractedSignals?.property_preferences?.config_interested || null;
  const unitInterested = extractedSignals?.property_preferences?.specific_unit_interest || null;
  const stagePreference = extractedSignals?.property_preferences?.stage_preference || null;
  const possessionUrgency = extractedSignals?.engagement_signals?.possession_urgency || null;
  const competitors = extractedSignals?.competitor_intelligence?.competitors_mentioned || [];
  const age = extractedSignals?.demographics?.age || null;
  const familyStage = extractedSignals?.demographics?.family_stage || null;
  const childrenCount = extractedSignals?.demographics?.children_count || null;
  const decisionMakers = extractedSignals?.engagement_signals?.decision_makers_present || null;
  const nonBookingReason = extractedSignals?.engagement_signals?.non_booking_reason || null;
  const negotiationAsks = extractedSignals?.engagement_signals?.negotiation_asks || [];
  const visitCount = extractedSignals?.engagement_signals?.visit_count || 1;
  const sampleFeedback = extractedSignals?.engagement_signals?.sample_feedback || "not_seen";
  const coreMotivation = extractedSignals?.core_motivation || "";
  const visitNotesSummary = extractedSignals?.visit_notes_summary || "";

  // Format KB data
  const kbSection = formatKBForScenarioPrompt(towerInventory || [], competitorPricing || [], projectMetadata);
  
  // Safety override section
  const safetySection = safetyCheck.triggered 
    ? `
## ⚠️ SAFETY RULE TRIGGERED — MANDATORY OVERRIDE
**${safetyCheck.safetyRule}**

You MUST:
- For 75+ RTMI: Immediately pivot to Immensa/Sunrise ready options. Do NOT pitch UC.
- For Proxy Buyer: Push for decision maker visit or video call. Create urgency.
- For Settlement Seeker: Redirect to RTMI/Resale desk immediately.

This overrides all other considerations. Your NBA and talking points MUST reflect this safety rule.
`
    : "";

  const prompt = `You are an expert real estate sales strategist for Kalpataru Parkcity (premium residential township, Thane, India).

Your task: Generate the OPTIMAL Next Best Action and 2-3 Talking Points for this specific lead.

# YOUR APPROACH

1. **CLASSIFY THE SCENARIO**: Read the customer's situation (visit notes, concerns, signals) and identify which 1-2 scenarios from the Playbook best match.
2. **IDENTIFY THE GOAL**: What are we trying to achieve with this customer right now? (Close the deal, overcome a specific objection, redirect to better-fit product, create urgency, etc.)
3. **GENERATE ARGUMENTS**: Using the Playbook's strategic guidance AND the live Knowledge Base data, craft specific, data-backed talking points. Use REAL numbers from the KB — never generic examples.
4. **PERSONALIZE**: Adjust tone and emphasis based on the persona and their specific situation.

# CUSTOMER SITUATION

## Lead Profile
- Persona: ${persona}
- Rating: ${rating} (PPS: ${ppsScore || "N/A"})
- Core Motivation: ${coreMotivation}
- Family Stage: ${familyStage || "Unknown"}, Children: ${childrenCount || "Unknown"}
- Age: ${age || "Unknown"}

## What They Want
- Config: ${configInterested || "Not specified"}
- Carpet Desired: ${carpetDesired || "Not specified"}
- Budget: ${budgetStated ? `₹${budgetStated} Cr` : "Not stated"}
- Budget Gap: ${budgetGap !== null ? `${budgetGap.toFixed(1)}%` : "Not calculated"}${customerMentionedPriceHigh ? " — Customer explicitly mentioned price is too high" : ""}
- Stage Preference: ${stagePreference || "Not specified"}
- Possession Urgency: ${possessionUrgency || "Not stated"}
- Specific Unit Interest: ${unitInterested ? unitInterested.join(", ") : "None"}

## Their Concerns
- Primary Concern: ${primaryConcern || "None detected"}
- Key Concerns: ${keyConcerns.length > 0 ? keyConcerns.join(", ") : "None extracted"}
- Concern Categories: ${concernCategories.length > 0 ? concernCategories.join(", ") : "None"}
- Non-Booking Reason: ${nonBookingReason || "Not stated"}
- Negotiation Asks: ${negotiationAsks.length > 0 ? negotiationAsks.join(", ") : "None"}

## Engagement Context
- Visit Count: ${visitCount}
- Sample Feedback: ${sampleFeedback}
- Decision Makers: ${decisionMakers || "Unknown"}
- Visit Notes: ${visitNotesSummary}

## Competitors Mentioned
${competitors.length > 0 
  ? competitors.map((c: any) => `- ${c.name}${c.project ? ` (${c.project})` : ""}: ${c.carpet_stated ? `${c.carpet_stated} sqft` : ""} ${c.price_stated_cr ? `at ₹${c.price_stated_cr} Cr` : ""} ${c.advantage_stated ? `— "${c.advantage_stated}"` : ""}`).join("\n")
  : "None mentioned"}

## Raw Visit Comments (for nuance)
${visitComments ? visitComments.substring(0, 500) : "No visit comments available"}

${safetySection}

# STRATEGIC PLAYBOOK (Use as guidance — match scenarios to this customer)

${OBJECTION_PLAYBOOK}

${kbSection}

# GENERATION RULES

1. **Match 1-2 scenarios from the Playbook** that best fit this customer's situation
2. **Use the Playbook's strategic guidance** as your reasoning framework — it tells you WHAT arguments to make
3. **Fill in REAL numbers** from the Knowledge Base — never use placeholder or example numbers
4. **Each talking point should be a specific, actionable argument** — not a template or generic statement
5. **The NBA should be a concrete next step** — what exactly should the sales person do tomorrow?

## Talking Point Types (generate 2-3, prioritize in this order):
1. **Objection handling** — Directly addresses customer's primary concern with data
2. **Competitor handling** — If competitor mentioned, specific data-backed counter (use KB competitor pricing)
3. **Value highlight** — Proactively surfaces a project strength relevant to this persona's motivation

## Talking Point Quality Rules:
- Maximum 25 words per talking point
- Must contain at least ONE specific number from the Knowledge Base (price, area, count, percentage)
- Must be an ARGUMENT, not a description — it should persuade, not inform
- If competitor mentioned, include specific price/area comparison from KB data

## NBA Quality Rules:
- Maximum 20 words
- Must specify: WHO does WHAT by WHEN
- Must be actionable by a sales person (not "analyze" or "evaluate")
- Action types: COMMUNICATION | CONTENT/COLLATERAL | OFFER | FOLLOW-UP | ESCALATION

# OUTPUT FORMAT
Return ONLY valid JSON:
{
  "scenario_matched": ["Playbook scenario name 1", "Playbook scenario name 2"],
  "customer_goal": "What we're trying to achieve with this customer (1 sentence)",
  
  "next_best_action": {
    "action_type": "COMMUNICATION" | "CONTENT/COLLATERAL" | "OFFER" | "FOLLOW-UP" | "ESCALATION",
    "action": "Specific action max 20 words",
    "escalation_trigger": "When to escalate if this doesn't work",
    "fallback_action": "Alternative if primary fails"
  },
  
  "talking_points": [
    {
      "type": "Objection handling" | "Competitor handling" | "Value highlight",
      "point": "Specific argument max 25 words with real numbers from KB",
      "playbook_scenario": "Which playbook scenario inspired this"
    }
  ],
  
  "safety_check_triggered": ${safetyCheck.triggered ? `"${safetyCheck.safetyRule}"` : "null"}
}`;

  return prompt;
}

// ============= KB FORMATTER FOR SCENARIO PROMPT =============

function formatKBForScenarioPrompt(
  towerInventory: any[],
  competitorPricing: any[],
  projectMetadata: any
): string {
  let kb = `\n# KNOWLEDGE BASE (Use ONLY these numbers in your arguments)\n`;
  
  if (towerInventory && towerInventory.length > 0) {
    kb += `\n## Project Inventory (Closing Prices = All-inclusive Total Value)\n`;
    kb += `| Tower | Typology | Carpet (sqft) | Closing Price (Cr) | OC Date | Unsold |\n`;
    kb += `|-------|----------|---------------|-------------------|---------|--------|\n`;
    
    for (const row of towerInventory) {
      const carpet = row.carpet_sqft_min && row.carpet_sqft_max 
        ? `${row.carpet_sqft_min}-${row.carpet_sqft_max}` 
        : row.carpet_sqft_min || row.carpet_sqft_max || "N/A";
      const closingMin = row.closing_min_cr ? `₹${row.closing_min_cr.toFixed(2)}` : "N/A";
      const closingMax = row.closing_max_cr ? `₹${row.closing_max_cr.toFixed(2)}` : "N/A";
      kb += `| ${row.tower || "?"} | ${row.typology || "N/A"} | ${carpet} | ${closingMin}-${closingMax} | ${row.oc_date || "TBD"} | ${row.unsold ?? "N/A"} |\n`;
    }
  }
  
  if (competitorPricing && competitorPricing.length > 0) {
    kb += `\n## Competitor Pricing\n`;
    kb += `| Competitor | Project | Config | Carpet (sqft) | Price (Lakhs) | PSF | vs Eternia |\n`;
    kb += `|------------|---------|--------|---------------|---------------|-----|------------|\n`;
    
    for (const row of competitorPricing) {
      const carpet = row.carpet_sqft_min && row.carpet_sqft_max 
        ? `${row.carpet_sqft_min}-${row.carpet_sqft_max}` 
        : "N/A";
      kb += `| ${row.competitor_name || "?"} | ${row.project_name || "N/A"} | ${row.config || "N/A"} | ${carpet} | ₹${row.price_min_av || "N/A"}-${row.price_max_av || "N/A"}L | ₹${row.avg_psf?.toLocaleString() || "N/A"} | ${row.vs_eternia || "N/A"} |\n`;
    }
  }
  
  if (projectMetadata) {
    kb += `\n## Key Project Facts\n`;
    kb += `- Township: ${projectMetadata.township?.total_area_acres || 100} acres, Grand Central Park: ${projectMetadata.township?.grand_central_park?.area_acres || 20.5} acres\n`;
    kb += `- Eternia: 10 towers, ${projectMetadata.township?.grand_central_park?.trees || "8000+"} trees\n`;
    kb += `- 4 entry/exit points, vehicle-free podium\n`;
    
    if (projectMetadata.inventory?.configurations) {
      kb += `\n### Eternia Configurations:\n`;
      for (const config of projectMetadata.inventory.configurations) {
        kb += `- ${config.type}: ${config.carpet_sqft_range?.[0]}-${config.carpet_sqft_range?.[1]} sqft, ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr\n`;
      }
    }
  }
  
  return kb;
}
```

---

## Changes to `index.ts`

### 1. Add import at top

```typescript
import {
  buildStage3ScenarioPrompt
} from "./nba-scenario-framework.ts";
```

### 2. Add variant selection logic (before Stage 3 block, ~line 880)

```typescript
// ===== STAGE 3 VARIANT SELECTION =====
// A/B test: "matrix" (existing) vs "scenario" (new)
// Use lead ID hash for consistent assignment
const stage3Variant: "matrix" | "scenario" = 
  (parseInt(lead.id?.replace(/[^0-9]/g, '') || '0') % 2 === 0) 
    ? "scenario" 
    : "matrix";
console.log(`Stage 3 variant for lead ${lead.id}: ${stage3Variant}`);
```

### 3. Add scenario variant branch inside Stage 3 block

After the existing `if (parseSuccess)` block for Stage 3, wrap the existing code in an `if (stage3Variant === "matrix")` block and add the `else` for scenario:

```typescript
if (parseSuccess) {
  if (stage3Variant === "matrix") {
    // ===== EXISTING STAGE 3: MATRIX-DRIVEN =====
    // ... all existing Stage 3 code stays exactly as-is ...
    
  } else {
    // ===== NEW STAGE 3: SCENARIO-DRIVEN =====
    console.log(`Stage 3 Scenario starting for lead ${lead.id}`);
    
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const visitComments = lead.rawData?.["Visit Comments"] || 
                         lead.rawData?.["Remarks in Detail"] || 
                         lead.rawData?.["Site Re-Visit Comment"] || "";
    
    try {
      const stage3ScenarioPrompt = buildStage3ScenarioPrompt(
        analysisResult,
        extractedSignals,
        visitComments,
        towerInventory || [],
        competitorPricing || [],
        projectMetadata
      );
      
      const stage3Response = await callOpenRouterAPI(
        "You are a sales strategy AI. Return valid JSON only.", 
        stage3ScenarioPrompt
      );
      
      let cleanedStage3 = stage3Response.trim();
      if (cleanedStage3.startsWith("```json")) cleanedStage3 = cleanedStage3.slice(7);
      else if (cleanedStage3.startsWith("```")) cleanedStage3 = cleanedStage3.slice(3);
      if (cleanedStage3.endsWith("```")) cleanedStage3 = cleanedStage3.slice(0, -3);
      const stage3Result = JSON.parse(cleanedStage3.trim());
      
      stage3Model = "claude-sonnet-4.5 (scenario)";
      console.log(`Stage 3 Scenario complete for lead ${lead.id}`);
      
      // Safety override (code-level, same as matrix variant)
      const safetyCheck = checkSafetyConditions(analysisResult.persona, extractedSignals);
      if (safetyCheck.triggered && !stage3Result.safety_check_triggered) {
        const overrideNba = getNBARuleDef(safetyCheck.overrideNbaId || "");
        if (overrideNba) {
          stage3Result.next_best_action = {
            action_type: overrideNba.action_category,
            action: overrideNba.specific_action,
            escalation_trigger: overrideNba.escalation_trigger,
            fallback_action: overrideNba.fallback_action,
          };
          stage3Result.safety_check_triggered = safetyCheck.safetyRule;
        }
      }
      
      // Map scenario output to analysis result format
      analysisResult.next_best_action = stage3Result.next_best_action;
      analysisResult.talking_points = stage3Result.talking_points;
      analysisResult.scenario_matched = stage3Result.scenario_matched;
      analysisResult.customer_goal = stage3Result.customer_goal;
      analysisResult.safety_check_triggered = stage3Result.safety_check_triggered;
      
    } catch (stage3Error) {
      console.warn(`Stage 3 Scenario failed for lead ${lead.id}, falling back to matrix...`, stage3Error);
      stage3Model = "matrix-fallback";
      
      // Fall back to existing matrix-driven approach
      // ... (copy existing matrix Stage 3 code as fallback) ...
    }
  }
}
```

### 4. Store variant in analysis result

```typescript
analysisResult.models_used = {
  stage1: stage1Model,
  stage2: stage2Model,
  stage2_5: stage25Model,
  stage3: stage3Model,
  stage3_variant: stage3Variant, // NEW: "matrix" or "scenario"
  stage4_evaluator: stage4Model,
};
```

---

## Changes to `evaluator.ts`

In `buildEvaluatorPrompt()`, add a condition to skip TP-ID validation for scenario variant:

```typescript
// Add to evaluator prompt, in the validation rules section:
${stage3Variant === "scenario" ? `
## SCENARIO VARIANT RULES
This lead was processed with the scenario-driven Stage 3 variant.
- DO NOT validate tp_id existence (scenario variant generates free-form talking points)
- DO validate: factual accuracy of numbers, KB data correctness, pricing accuracy
- DO validate: NBA action is specific and actionable
` : `
## MATRIX VARIANT RULES  
- Every tp_id in talking_points MUST exist in TALKING_POINTS definitions
- NBA nba_id MUST exist in NBA_RULES definitions
`}
```

---

## UI Changes (for A/B comparison)

Add a visual indicator in the lead analysis card showing which variant was used. In the frontend component that renders `full_analysis`:

```tsx
{/* Stage 3 Variant Badge */}
{fullAnalysis?.models_used?.stage3_variant && (
  <Badge variant={fullAnalysis.models_used.stage3_variant === "scenario" ? "outline" : "default"}>
    {fullAnalysis.models_used.stage3_variant === "scenario" ? "🔬 Scenario" : "📊 Matrix"}
  </Badge>
)}

{/* Scenario-specific fields */}
{fullAnalysis?.scenario_matched && (
  <div className="text-xs text-muted-foreground">
    Matched: {fullAnalysis.scenario_matched.join(" + ")}
  </div>
)}
{fullAnalysis?.customer_goal && (
  <div className="text-xs text-muted-foreground italic">
    Goal: {fullAnalysis.customer_goal}
  </div>
)}
```

---

## Lovable Implementation Instructions

### Step-by-step for Lovable AI:

**Step 1: Create `supabase/functions/analyze-leads/nba-scenario-framework.ts`**
- Copy the complete file from the "Implementation" section above
- This file contains:
  - `OBJECTION_PLAYBOOK` constant (markdown string with 39 scenarios)
  - `buildStage3ScenarioPrompt()` function 
  - `formatKBForScenarioPrompt()` helper function
- It imports `checkSafetyConditions` and `getNBARuleDef` from the existing `nba-framework.ts`

**Step 2: Modify `supabase/functions/analyze-leads/index.ts`**
- Add import: `import { buildStage3ScenarioPrompt } from "./nba-scenario-framework.ts";`
- Before the Stage 3 block (~after Stage 2.5 cross-sell), add variant selection:
  ```typescript
  const stage3Variant: "matrix" | "scenario" = 
    (parseInt(lead.id?.replace(/[^0-9]/g, '') || '0') % 2 === 0) ? "scenario" : "matrix";
  ```
- Wrap existing Stage 3 code in `if (stage3Variant === "matrix") { ... }`
- Add `else { ... }` block with scenario variant code (see Section 3 above)
- Add `stage3_variant` to `models_used` metadata
- The scenario variant uses the same `callOpenRouterAPI()` function as the existing matrix variant
- Safety overrides use the same `checkSafetyConditions()` and `getNBARuleDef()` from nba-framework.ts

**Step 3: Minor update to `evaluator.ts`**
- Pass `stage3Variant` to the evaluator prompt builder
- When variant is "scenario", skip TP-ID existence validation but keep all other checks

**Step 4: UI — Show variant badge on lead analysis cards**
- In the component that displays `fullAnalysis.models_used`, add a Badge showing "Matrix" or "Scenario"
- Show `scenario_matched` and `customer_goal` fields when present
- These are informational only — both variants produce the same `talking_points[]` and `next_best_action{}` structure

**Key constraints for Lovable:**
- Do NOT modify Stage 1, Stage 2, or Stage 2.5 prompts or code
- Do NOT modify the existing `nba-framework.ts` — the scenario variant is a NEW file
- The output schema for both variants must match — `talking_points[]` and `next_best_action{}` 
- The scenario variant adds 2 extra fields: `scenario_matched` and `customer_goal`
- Both variants go through the same Stage 4 evaluator (with variant-aware validation)

---

## Testing Strategy

1. **A/B Split**: 50/50 by lead ID hash (deterministic, reproducible)
2. **Compare on same leads**: Re-analyze all leads, compare matrix vs scenario outputs side-by-side
3. **Metrics to track**:
   - Talking point specificity (does it contain real numbers?)
   - Talking point relevance (does it address the actual concern?)
   - NBA actionability (is it a concrete next step?)
   - Factual accuracy (do numbers match KB?)
4. **Manual review**: Sales team reviews 20 leads from each variant
5. **Switch-over criteria**: If scenario variant is consistently better on all 4 metrics, make it the default

---

## Token Budget Comparison

| Component | Matrix Variant | Scenario Variant |
|-----------|---------------|-----------------|
| System prompt | ~200 tokens | ~200 tokens |
| Lead context | ~400 tokens | ~600 tokens (more detailed) |
| Framework/Playbook | ~3,000-5,000 tokens (subset of 43 TPs) | ~3,000 tokens (full playbook) |
| KB data | ~1,500 tokens | ~1,500 tokens |
| Instructions | ~1,500 tokens | ~800 tokens (simpler) |
| **Total** | **~6,600-8,100** | **~6,100** |

The scenario variant is actually slightly smaller because it doesn't inject individual TP definitions with all their sub-fields (emotional_hook, logical_argument, competitor_counter, etc.).
