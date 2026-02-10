// ============= SCENARIO-DRIVEN NBA & TALKING POINTS FRAMEWORK =============
// Alternative Stage 3 variant: Uses source objection playbook as LLM grounding
// instead of persona-objection matrix lookup + TP-ID contextualization.
//
// Key difference from nba-framework.ts:
// - Matrix variant: Deterministic TP-ID selection → LLM contextualizes templates
// - Scenario variant: LLM reads playbook + KB → generates arguments from scratch
//
// Both produce the same output schema: talking_points[] + next_best_action{}

import { checkSafetyConditions, getNBARuleDef } from "./nba-framework.ts";

// ============= CLEANED OBJECTION HANDLING PLAYBOOK =============
// Source: Kalpataru Parkcity Sales Team Excel (39 scenario-NBA pairs, 7 categories)
// Lightly cleaned: fixed typos, consistent formatting, preserved strategic conversational tone

const OBJECTION_PLAYBOOK = `
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
GUIDANCE: Don't say flat no. Discuss client's financial flow first, then suggest cheaper option via payment schedule or bullet plan post management approval. Explain developer business model — impossible to give without cost. Show how missing out on a home that fits all requirements just for subvention doesn't make sense.

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
GUIDANCE: Show value of buying UC at current price for later possession. Suggest investment into govt bonds to save capital gain (discuss with CA). Show rent paid till possession vs what client is buying and benefits at possession.

**Long-Term Fatigue / Fear of Delay**

SCENARIO: Possession too late (e.g. 2030)
GUIDANCE: Highlight: (1) Inventory choice advantage, (2) Price lock now, (3) Sooner possession inventory options, (4) Subvention = risk taken by developer. Show: construction updates/videos, CC/OC received towers walkthrough with unit count, happy customer testimonials, events showcase (e.g. Immensa Clubhouse), retail taking shape. Investment angle: lower entry price today = higher appreciation by possession.

SCENARIO: Developer delay belief / construction behind timeline
GUIDANCE: Show projected vs actual construction timelines taken at year start. Highlight it's hearsay and project is actually on track. Share happy customer testimonies (personal experience, delivered unit tour, video testimonial). Highlight prominent names in micro-market who delayed but remain trusted. Emphasize quality and planning difference vs competition.

---

### 3. INVENTORY & PRODUCT

**Layout / Size**

SCENARIO: Space perception — rooms feel small
GUIDANCE: Upgrade pitch: Move to 783 sqft (Estella) if budget allows. Zero-wastage explanation vs competitor wasted space. "Outdoor Room" concept: balcony/deck as extended living space.

SCENARIO: Need unit with deck (budget or usable area concern)
GUIDANCE: Option A: Pitch deck unit with aggressive payment to cover deck cost. Break down house cost vs deck cost separately. Show larger non-deck unit as alternative. Option B: Aggressive payment for preferred size+deck. Show larger unit without deck for the family upgrade.

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


// ============= KB FORMATTER FOR SCENARIO PROMPT =============

function formatKBForScenarioPrompt(
  towerInventory: any[],
  competitorPricing: any[],
  projectMetadata: any
): string {
  let kb = `\n# KNOWLEDGE BASE (Use ONLY these numbers in your arguments — NEVER example numbers)\n`;
  
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
    kb += `- Township: ${projectMetadata.township?.total_area_acres || 100} acres\n`;
    kb += `- Grand Central Park: ${projectMetadata.township?.grand_central_park?.area_acres || 20.5} acres, ${projectMetadata.township?.grand_central_park?.trees || "8000+"} trees\n`;
    kb += `- Eternia: 10 towers in Eternia phase\n`;
    kb += `- 4 entry/exit points, vehicle-free podium\n`;
    kb += `- Developer: Kalpataru (55 years, 113+ projects delivered)\n`;
    
    if (projectMetadata.inventory?.configurations) {
      kb += `\n### Eternia Configurations:\n`;
      for (const config of projectMetadata.inventory.configurations) {
        kb += `- ${config.type}: ${config.carpet_sqft_range?.[0]}-${config.carpet_sqft_range?.[1]} sqft, ₹${config.price_range_cr?.[0]}-${config.price_range_cr?.[1]} Cr\n`;
      }
    }
  }
  
  return kb;
}


// ============= SCENARIO-DRIVEN STAGE 3 PROMPT BUILDER =============

/**
 * Build Stage 3 prompt using scenario-driven approach.
 * 
 * Instead of:
 *   persona × objection → matrix lookup → TP-ID → contextualize template
 * 
 * This does:
 *   customer situation + playbook guidance + live KB → LLM generates arguments
 *
 * Same inputs and output schema as buildStage3Prompt() in nba-framework.ts
 */
export function buildStage3ScenarioPrompt(
  stage2Result: any,
  extractedSignals: any,
  visitComments: string,
  towerInventory?: any[],
  competitorPricing?: any[],
  projectMetadata?: any
): string {
  // Reuse safety checks from matrix framework
  const safetyCheck = checkSafetyConditions(
    stage2Result?.persona || "Unknown", 
    extractedSignals
  );
  
  // Extract lead context from Stage 1 & 2 outputs
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
  const kbSection = formatKBForScenarioPrompt(
    towerInventory || [], 
    competitorPricing || [], 
    projectMetadata
  );
  
  // Safety override section
  const safetySection = safetyCheck.triggered 
    ? `
## ⚠️ SAFETY RULE TRIGGERED — MANDATORY OVERRIDE
**${safetyCheck.safetyRule}**

You MUST:
- For 75+ RTMI: Pivot to Immensa/Sunrise ready options ONLY if the customer's budget fits the closing price range of available units there (check KB). If budget does not match, explore other ways to address their concerns (e.g., flexible payment plans, alternate configurations within budget). Do NOT pitch UC.
- For Proxy Buyer: Push for decision maker visit or video call. Create urgency.
- For Settlement Seeker: Redirect to RTMI/Resale desk immediately.

IMPORTANT: If no realistic or feasible action/talking point exists for a lead, do NOT force-fit a solution. Instead, recommend a generic follow-up or long-term engagement plan (e.g., periodic check-ins, future launch updates, festive offer alerts). Accuracy matters more than comprehensiveness — never hallucinate data or fabricate arguments.

This overrides all other considerations.
`
    : "";

  // Competitor context string
  const competitorContext = competitors.length > 0 
    ? competitors.map((c: any) => 
        `- ${c.name}${c.project ? ` (${c.project})` : ""}: ${c.carpet_stated ? `${c.carpet_stated} sqft` : ""} ${c.price_stated_cr ? `at ₹${c.price_stated_cr} Cr` : ""} ${c.advantage_stated ? `— "${c.advantage_stated}"` : ""}`
      ).join("\n")
    : "None mentioned";

  const prompt = `You are an expert real estate sales strategist for Kalpataru Parkcity (premium residential township, Thane, India).

Generate the OPTIMAL Next Best Action and 2-3 Talking Points for this lead.

# YOUR APPROACH

1. **CLASSIFY THE SCENARIO**: Read the customer's situation and identify which 1-2 scenarios from the Playbook best match.
2. **IDENTIFY THE GOAL**: What are we trying to achieve? (Close deal, overcome objection, redirect to better-fit product, create urgency, etc.)
3. **GENERATE ARGUMENTS**: Using Playbook strategic guidance AND live Knowledge Base data, craft specific, data-backed talking points with REAL numbers.
4. **PERSONALIZE**: Adjust tone based on persona and specific situation.

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
- Non-Booking Reason: ${nonBookingReason || "Not stated"}
- Negotiation Asks: ${negotiationAsks.length > 0 ? negotiationAsks.join(", ") : "None"}

## Engagement Context
- Visit Count: ${visitCount}
- Sample Feedback: ${sampleFeedback}
- Decision Makers: ${decisionMakers || "Unknown"}

## Competitors Mentioned
${competitorContext}

## Visit Notes
${visitNotesSummary}
${visitComments ? `\nRaw comments: ${visitComments.substring(0, 400)}` : ""}

${safetySection}

# STRATEGIC PLAYBOOK (Match scenarios to this customer)

${OBJECTION_PLAYBOOK}

${kbSection}

# GENERATION RULES

1. Match 1-2 scenarios from Playbook that best fit this customer
2. Use Playbook guidance as reasoning framework — it tells you WHAT arguments to make
3. Fill in REAL numbers from Knowledge Base — never placeholder or example numbers
4. Each talking point = specific, data-backed argument that persuades (not informs)
5. NBA = concrete next step a sales person can execute tomorrow

## Talking Point Rules (generate 2-3, prioritize: Objection > Competitor > Highlight):
- Max 25 words per point
- Must contain at least ONE specific number from KB
- Must be an ARGUMENT, not a description

## NBA Rules:
- Max 20 words
- Specify: WHO does WHAT by WHEN
- Types: COMMUNICATION | CONTENT/COLLATERAL | OFFER | FOLLOW-UP | ESCALATION

# OUTPUT (Return ONLY valid JSON)
{
  "scenario_matched": ["Playbook scenario 1", "Playbook scenario 2"],
  "customer_goal": "What we're trying to achieve (1 sentence)",
  "next_best_action": {
    "action_type": "COMMUNICATION" | "CONTENT/COLLATERAL" | "OFFER" | "FOLLOW-UP" | "ESCALATION",
    "action": "Specific action max 20 words",
    "escalation_trigger": "When to escalate",
    "fallback_action": "Alternative if primary fails"
  },
  "talking_points": [
    {
      "type": "Objection handling" | "Competitor handling" | "Value highlight",
      "point": "Specific argument max 25 words with real KB numbers",
      "playbook_scenario": "Which playbook scenario inspired this"
    }
  ],
  "safety_check_triggered": ${safetyCheck.triggered ? `"${safetyCheck.safetyRule}"` : "null"}
}`;

  console.log(`[ScenarioVariant] Stage 3 prompt length: ${prompt.length} chars`);
  return prompt;
}
