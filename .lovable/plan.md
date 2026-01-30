
# NBA & Talking Points Framework Update

## Summary

This plan updates the `nba-framework.ts` file with all corrections from the uploaded Excel document, which includes:
- **12 Content Updates** to existing Talking Points (TP-ECO-003, TP-ECO-007, TP-ECO-008, TP-ECO-010, TP-POS-003, TP-POS-004, TP-INV-001, TP-INV-004, TP-INV-005, TP-INV-006, TP-DEC-001, TP-DEC-003)
- **10 New Talking Points** (TP-ECO-011, TP-INV-007, TP-INV-008, TP-INV-009, TP-INV-010, TP-LOC-004, TP-LOC-005, TP-COMP-006, TP-DEC-004, TP-DEC-005)
- **12 Content Updates** to existing NBA Rules
- **8 New NBA Rules** (NBA-COM-012, NBA-COM-013, NBA-COL-015, NBA-COL-016, NBA-COL-017, NBA-OFF-009, NBA-OFF-010, NBA-OFF-011)

---

## Changes Overview

### Talking Point Updates (12)

| TP-ID | Change Description |
|-------|-------------------|
| TP-ECO-003 | Add: MLCP parking issues, Lower Income Group concerns, families per sqft density |
| TP-ECO-007 | Add: Face-to-face instruction, Management approval requirement |
| TP-ECO-008 | Add: 0 stamp duty offer option for lower OCR |
| TP-ECO-010 | Add: KL broker introduction for property sale |
| TP-POS-003 | Add: CC/OC walkthrough, Events showcase, Retail taking shape |
| TP-POS-004 | Add: 'Hearsay' rebuttal language, Prominent delayed competitors |
| TP-INV-001 | Add: Estella 783sqft upgrade option, Outdoor Room concept |
| TP-INV-004 | Add: Developer can change entry, Vastu consultant remedies |
| TP-INV-005 | Add: Cluster-wise amenity breakdown (Eternia/Estella/Primera) |
| TP-INV-006 | Add: Anarock report, Office space, Temple, 4 entry/exit points |
| TP-DEC-001 | Add: 'Miss out' language, Offer expiry urgency |
| TP-DEC-003 | Add: Push for closure to lock price and exact unit |

### New Talking Points (10)

| TP-ID | Scenario |
|-------|----------|
| TP-ECO-011 | Better location at similar budget - Challenge peaked vs emerging |
| TP-INV-007 | Bigger carpet / Jodi rejection - Jodi benefits vs builder finish |
| TP-INV-008 | Privacy concern - Building gap and positioning details |
| TP-INV-009 | Floor preference - Aggressive payment for floor rise |
| TP-INV-010 | Ventilation/sunlight concern - Bareshell option |
| TP-LOC-004 | Vicinity congestion - 4 entry/exit, self-sustaining |
| TP-LOC-005 | Price seems low for location - Peaked vs growth potential |
| TP-COMP-006 | Competitor better payment schedule - Delay risk explanation |
| TP-DEC-004 | Need parents/influencers - Offer urgency, token push |
| TP-DEC-005 | Site visit request - TOKEN REQUIRED policy |

### NBA Rule Updates (12)

| NBA-ID | Change Description |
|--------|-------------------|
| NBA-COL-001 | Add: MLCP, Lower Income Group, Families per sqft in comparison |
| NBA-COL-002 | Add: CC/OC walkthrough, Events showcase, Retail progress |
| NBA-COL-003 | Add: Estella upgrade option, Outdoor Room concept |
| NBA-COL-006 | Add: Anarock report, Office space, Temple, 4 entry/exit |
| NBA-COL-009 | Add: Cluster-wise breakdown (Eternia/Estella/Primera) |
| NBA-COL-013 | Add: Hearsay rebuttal, Prominent delayed developers list |
| NBA-COM-010 | Add: Push for closure to lock price and exact unit |
| NBA-OFF-001 | Add: Face-to-face, Management approval requirement |
| NBA-OFF-002 | Add: 0 stamp duty offer option |
| NBA-OFF-003 | Add: KL broker for property sale |
| NBA-OFF-006 | Add: Developer modification, Vastu consultant remedies |
| NBA-OFF-008 | Add: 'Miss out' language, Offer expiry |

### New NBA Rules (8)

| NBA-ID | Trigger Condition |
|--------|------------------|
| NBA-COM-012 | IF buyer needs to bring parents/influencers to decide |
| NBA-COM-013 | IF customer wants to see site/unit before deciding |
| NBA-COL-015 | IF objection = 'Vicinity congested' |
| NBA-COL-016 | IF objection = 'Privacy priority' |
| NBA-COL-017 | IF objection = 'Need bigger carpet' AND jodi_interest = False |
| NBA-OFF-009 | IF requirement = 'Specific floor' AND floor_premium_concern |
| NBA-OFF-010 | IF objection = 'Ventilation/sunlight' AND flexibility_exists |
| NBA-OFF-011 | IF objection = 'Competitor better payment schedule' |

---

## Technical Implementation

### File to Modify
`supabase/functions/analyze-leads/nba-framework.ts`

### Section 1: TALKING_POINTS Matrix Updates (Lines ~71-456)

#### Updates to Existing Talking Points

**TP-ECO-003** (Line ~93-103):
```typescript
"TP-ECO-003": {
  tp_id: "TP-ECO-003",
  category: "Economic Fit",
  sub_category: "Pricing Gap Vs Perceived Value",
  objection_scenario: "Getting cheaper at competition",
  talking_point: "Show lifestyle and gentry comparison - who your neighbors will be. Highlight specific competitor negatives: MLCP parking issues, Lower Income Group as residents, families per sqft density",
  key_data_points: "Kalpataru buyer profile vs competitor, Township amenities density, Families per sqft metric (Lodha Amara: 121 families/acre vs Kalpataru lower density), MLCP vs dedicated parking",
  emotional_hook: "Your children's friends, your social circle - this is defined by who lives around you. The gentry you share your home with impacts your family's lifestyle",
  logical_argument: "Lodha Amara: 4864 units in 40 towers = high density, MLCP parking, mixed income group. Eternia: 1266 units in 10 towers = exclusive community, dedicated parking, curated resident profile",
  competitor_counter: "Lodha Amara: MLCP parking issues, Lower Income Group concerns, 35+ tower density. Dosti: Lower quality fittings, mixed community profile",
},
```

**TP-ECO-007** (Line ~135-145):
```typescript
"TP-ECO-007": {
  tp_id: "TP-ECO-007",
  category: "Economic Fit",
  sub_category: "Payment Schedule",
  objection_scenario: "CLP deviation making price go beyond budget",
  talking_point: "Suggest floor/unit adjustment to absorb deviation cost. DO THIS FACE TO FACE. Make strategy of what to offer BEFOREHAND post taking MANAGEMENT APPROVAL. Show what competition offers at similar deviations",
  key_data_points: "Floor premium rates, Unit alternatives with payment flexibility, Competition pricing with similar deviations, Management-approved deviation options",
  emotional_hook: "Let's find the sweet spot where your budget works and you don't compromise on your home",
  logical_argument: "A 2-floor lower unit saves ₹4-6L which covers the CLP deviation. Same view, same layout, better terms. Compare with what competition offers with such deviations",
  competitor_counter: "Competition may offer lower loading but check their construction progress and delay history",
},
```

**TP-ECO-008** (Line ~146-155):
```typescript
"TP-ECO-008": {
  tp_id: "TP-ECO-008",
  category: "Economic Fit",
  sub_category: "Cashflow/EMI Stress",
  objection_scenario: "OCR contribution issue",
  talking_point: "Suggest microfinance products, structured payment plans based on income cycle, AND 0 STAMP DUTY OFFER post discussion with management for lower OCR",
  key_data_points: "Personal loan rates, Bullet payment options, Appraisal-linked payment plans, 0 STAMP DUTY OFFER (requires management approval)",
  emotional_hook: "Your career is on an upward trajectory. Let's align payments with your growth",
  logical_argument: "Bullet plan: Pay 15% now, 5% after your appraisal (6 months), balance at milestones. For lower OCR, discuss 0 stamp duty offer with management",
},
```

**TP-ECO-010** (Line ~166-175):
```typescript
"TP-ECO-010": {
  tp_id: "TP-ECO-010",
  category: "Economic Fit",
  sub_category: "Cashflow/EMI Stress",
  objection_scenario: "CSOP (Current Sale of Property) required",
  talking_point: "Suggest conditional booking with timeline, connect with resale partners. INTRODUCE A BROKER OF KL who can help sell the property faster and gives us control and visibility of what's happening with CSOP",
  key_data_points: "Conditional booking terms, Partner resale agency track record, Market sale timeline, KL's BROKER NETWORK for property sale assistance",
  emotional_hook: "Your current home's value is your stepping stone. Let's unlock it together with our support",
  logical_argument: "Conditional booking: ₹1L locks unit for 60 days. Our KL broker partner can help sell your property faster (avg 45 days in Borivali/Dahisar) and keeps us updated on progress",
},
```

**TP-POS-003** (Line ~199-209):
```typescript
"TP-POS-003": {
  tp_id: "TP-POS-003",
  category: "Possession Timeline",
  sub_category: "Long-Term Fatigue",
  objection_scenario: "Possession too late (2027-2030)",
  talking_point: "Show construction progress, RERA timeline compliance, subvention as risk mitigation. Show CC/OC RECEIVED TOWERS WALKTHROUGH. Mention # of units delivered. Show EVENTS SHOWCASE (e.g., Immensa Clubhouse). Show RETAIL TAKING SHAPE",
  key_data_points: "Current construction % vs RERA timeline, Monthly drone footage, CC/OC received tower references with unit count, Events at Immensa Clubhouse, Retail development progress photos",
  emotional_hook: "Let me show you something real - not promises, progress. See our delivered towers, clubhouse events, retail coming alive",
  logical_argument: "Tower C: 98% structural complete, Tower D: 96%. We're AHEAD of RERA timeline by 5%. CC/OC received for [X] towers with [Y] units delivered. Immensa Clubhouse hosting events. Retail 60% operational",
  competitor_counter: "Compare with Immensa delivered on time. Same developer, same standards",
},
```

**TP-POS-004** (Line ~210-220):
```typescript
"TP-POS-004": {
  tp_id: "TP-POS-004",
  category: "Possession Timeline",
  sub_category: "Long-Term Fatigue",
  objection_scenario: "Developer delay history concern (Immensa)",
  talking_point: "Address Immensa transparently, show Eternia's different trajectory. Highlight that delay concerns are HEARSAY - project is on right path. Share happy customer testimonies. Highlight PROMINENT NAMES IN MICRO MARKET who have delayed but are still considered good buying options",
  key_data_points: "Immensa specific delay causes (COVID, approvals), Eternia current progress, Independent verification, Customer testimony videos, List of prominent developers who delayed (Lodha, Hiranandani past delays)",
  emotional_hook: "I won't dismiss your concern - let me address it directly with facts. What you've heard is mostly hearsay",
  logical_argument: "Immensa faced 2020 COVID + municipal delays (documented). Eternia started 2022 with learnings applied. Current progress: 40% complete vs 35% RERA requirement = AHEAD. Even Lodha, Hiranandani have had delays yet remain trusted brands",
  competitor_counter: "Would you like to speak with Immensa residents? Or visit delivered towers?",
},
```

**TP-INV-001** (Line ~223-233):
```typescript
"TP-INV-001": {
  tp_id: "TP-INV-001",
  category: "Inventory & Product",
  sub_category: "Layout/Size",
  objection_scenario: "Space perception - rooms feel small",
  talking_point: "UPGRADE PITCH: Move to 783 sqft (ESTELLA) if budget allows. Show zero-wastage efficiency vs competitor wasted space. Emphasize 'OUTDOOR ROOM' - balcony/deck as extended living space",
  key_data_points: "Carpet efficiency %, Competitor passage wastage metrics, Furniture layout demo, ESTELLA 783 sqft option pricing, Deck/balcony as outdoor room square footage",
  emotional_hook: "It's not about sqft - it's about how you live in every inch. Your balcony is your outdoor room",
  logical_argument: "Option 1: Our 920sqft has 15% more usable space than competitor's 1000sqft. Option 2: UPGRADE to Estella 783sqft if budget allows. Option 3: Consider deck/balcony as your 'OUTDOOR ROOM' - extended living space",
  competitor_counter: "Dosti/Runwal layouts waste 12-18% in passages. Our zero-wastage design maximizes every foot",
},
```

**TP-INV-004** (Line ~255-264):
```typescript
"TP-INV-004": {
  tp_id: "TP-INV-004",
  category: "Inventory & Product",
  sub_category: "Vastu Compliance",
  objection_scenario: "Kitchen/entry direction issue",
  talking_point: "Acknowledge vastu importance. Show compliant inventory. Suggest changes CLIENT can make OR POST APPROVAL from management WHICH KL CAN MAKE for them. Share how DEVELOPER CAN CHANGE ENTRY to make vastu compliant. Share VASTU CONSULTANT REMEDIES",
  key_data_points: "Vastu-compliant unit list, Direction compass on floor plans, Limited availability messaging, KL's modification options (entry direction change), Vastu consultant remedies list",
  emotional_hook: "Your family's harmony matters. Let me show you options - including changes we can make for you",
  logical_argument: "We have 8 units that are fully NE/E facing with kitchen in SE corner. For other units: Client can make changes OR KL can modify entry direction post management approval. Vastu consultant remedies available for minor concerns",
},
```

**TP-INV-005** (Line ~265-274):
```typescript
"TP-INV-005": {
  tp_id: "TP-INV-005",
  category: "Inventory & Product",
  sub_category: "Amenities",
  objection_scenario: "Desired amenities unavailable",
  talking_point: "Show CLUSTER-WISE AMENITY distribution: ETERNIA vs ESTELLA vs PRIMERA. Show amenity-per-resident ratio. Show scale comparison",
  key_data_points: "CLUSTER-WISE BREAKDOWN: Eternia amenities, Estella amenities, Primera amenities. Olympic pool dimensions, Amenity per resident ratio by cluster, Clubhouse spread",
  emotional_hook: "Let me show you what 100+ acres of township means for your daily life - and which cluster fits you best",
  logical_argument: "ETERNIA: 50m Olympic pool, 20-acre GCP, 1.5-acre clubhouse. ESTELLA: Separate clubhouse, pool access. PRIMERA: Budget-friendly with shared township amenities. Ratio is 3x better than high-density projects",
},
```

**TP-INV-006** (Line ~275-284):
```typescript
"TP-INV-006": {
  tp_id: "TP-INV-006",
  category: "Investment",
  sub_category: "ROI Focus",
  objection_scenario: "Rental yield and ROI questions",
  talking_point: "Show rental data from Immensa/Sunrise, infrastructure appreciation thesis. Reference ANAROCK REPORT for Kolshet returns. Highlight township includes RETAIL/RESI/OFFICE SPACE/SCHOOL/TEMPLE. Mention 4 ENTRY/EXIT POINTS",
  key_data_points: "Current rental rates, Metro appreciation data, Price lock advantage, ANAROCK REPORT on Kolshet, Township composition: retail + residential + OFFICE SPACE + school + TEMPLE, 4 ENTRY/EXIT access points",
  emotional_hook: "Real estate is about rental yield today and appreciation tomorrow. We score on both. Anarock data backs this",
  logical_argument: "Immensa 2BHK rentals: ₹35-40K/month = 2.8-3.2% yield. Anarock report confirms Kolshet outperforming. Metro Line 4 impact: 20-30% appreciation. Self-sustaining township: retail, residential, OFFICE SPACE, school, TEMPLE with 4 entry/exit points",
},
```

**TP-DEC-001** (Line ~373-382):
```typescript
"TP-DEC-001": {
  tp_id: "TP-DEC-001",
  category: "Decision Process",
  sub_category: "Multiple Decision Makers",
  objection_scenario: "Need to visit competition first",
  talking_point: "Highlight OFFERS which are going on - CLIENT WILL MISS OUT on these. Create urgency with offer validity. OFFER WON'T BE APPLICABLE if he takes time. Set up competition comparison visits",
  key_data_points: "Current offer validity, Price escalation schedule, Unit availability status, Offer expiry date",
  emotional_hook: "Absolutely compare - that's smart buying. But let me help you not MISS OUT on what's available now",
  logical_argument: "Current festive offer valid until [date] - YOU WILL MISS THIS if you delay. Prices increase ₹5-8L next month. Unit A-805 has 2 other interested families. OFFER WON'T APPLY if you take time. Let's lock price with ₹1L refundable token",
},
```

**TP-DEC-003** (Line ~393-402):
```typescript
"TP-DEC-003": {
  tp_id: "TP-DEC-003",
  category: "Decision Process",
  sub_category: "Multiple Decision Makers",
  objection_scenario: "Looking on behalf of someone else",
  talking_point: "Create urgency with offer and unit scarcity. Push for decision-maker visit or VC. PUSH FOR CLOSURE TO GET THE PRICE AND EXACT UNIT",
  key_data_points: "Offer validity, Unit scarcity, VC option for remote decision makers",
  emotional_hook: "The person making this decision deserves to see this themselves. And we need to lock your price and unit",
  logical_argument: "I can do a video call with the decision maker. But this unit and this offer won't wait. PUSH FOR CLOSURE: Let's lock THE PRICE AND EXACT UNIT with a token. Can we schedule for tomorrow?",
},
```

#### New Talking Points to Add (After TP-SPEC-005)

```typescript
// NEW Talking Points (Framework Corrections)
"TP-ECO-011": {
  tp_id: "TP-ECO-011",
  category: "Economic Fit",
  sub_category: "Pricing Gap Vs Perceived Value",
  objection_scenario: "Getting better location at approx similar budget",
  talking_point: "Challenge the definition of better location. Established location has peaked out - will never see similar appreciation or infra development. Your micro market is going to be the next big focus for the city",
  key_data_points: "Price appreciation data: established vs emerging, Infra development pipeline, Neutral data on micro-market growth potential, City development focus areas",
  emotional_hook: "An established location gives you established prices with limited growth. Here, you're buying into the future",
  logical_argument: "Established micro-market has peaked - 5-7% max appreciation. Kolshet/Thane emerging = 15-20% potential. Similar budget, vastly different growth trajectory",
  competitor_counter: "Explain what exactly the other micro-market is providing vs what your development is giving. They charge only for established name, you get actual value",
},

"TP-INV-007": {
  tp_id: "TP-INV-007",
  category: "Inventory & Product",
  sub_category: "Layout/Size",
  objection_scenario: "Bigger carpet area needed - not interested in Jodi, wants builder finish",
  talking_point: "Share layout of JODI UNIT with customization possible. Explain benefits of jodi layout vs builder finish. Share market availability of this size unit and price comparison vs jodi total outflow",
  key_data_points: "Jodi unit layout options, Customization possibilities in jodi, Market availability of desired size, Price comparison: market rate vs jodi total cost (including making charges)",
  emotional_hook: "Let me show you how a jodi unit can be customized exactly to your needs - often better than builder finish",
  logical_argument: "Jodi layout benefits: You control the design, larger contiguous space, unique floor plan. Market comparison: [X] sqft units in area cost ₹[Y]. Jodi total outflow including customization: ₹[Z] - often comparable or better value",
},

"TP-INV-008": {
  tp_id: "TP-INV-008",
  category: "Inventory & Product",
  sub_category: "View Preference",
  objection_scenario: "Privacy top priority from any other building or unit",
  talking_point: "Share and compare price difference between unit with building in front vs GCP/creek facing. Share EXACT GAP between buildings. Share EXACT POSITIONING of units for privacy comfort",
  key_data_points: "Building gap measurements in meters, Unit positioning details, Price comparison (building view vs open view), Privacy-optimized unit list, Sight-line analysis",
  emotional_hook: "Your privacy at home is non-negotiable. Let me show you exactly how we've designed for this",
  logical_argument: "Gap between buildings: [X] meters. Unit positioning ensures no direct sight-lines. Price difference for GCP-facing (full privacy): ₹[Y]. Here's the exact positioning showing how privacy is maintained",
},

"TP-INV-009": {
  tp_id: "TP-INV-009",
  category: "Inventory & Product",
  sub_category: "Floor Preference",
  objection_scenario: "Certain floor required due to current residence or better views",
  talking_point: "Share AGGRESSIVE PAYMENT SCHEDULE to cover floor rise cost. Show how price justifies the views at preferred floor vs lower floors",
  key_data_points: "Floor premium rates (₹ per floor), Payment schedule options to cover premium, View comparison by floor (photos/videos), Price-to-view value justification",
  emotional_hook: "The floor you choose defines your view for decades. Let's make it work",
  logical_argument: "Floor rise premium: ₹[X] per floor. Your preferred floor costs ₹[Y] more. Aggressive payment schedule: [details]. View from floor [Z] vs lower floor - the difference is worth it",
},

"TP-INV-010": {
  tp_id: "TP-INV-010",
  category: "Inventory & Product",
  sub_category: "Ventilation & Lighting",
  objection_scenario: "Some rooms not getting enough sunlight and ventilation",
  talking_point: "Highlight benefits of unit apart from the ventilation concern. Offer BARESHELL UNIT post management approval where client can make changes WITHOUT MOVING WET AREAS",
  key_data_points: "Unit benefits list (other positives), Bareshell option availability, Permitted modifications (non-wet area changes), Management approval process for bareshell",
  emotional_hook: "Let's not lose a great home over one room. We have solutions",
  logical_argument: "This unit offers: [list benefits]. For the ventilation concern: Post management approval, we can offer BARESHELL where you can reconfigure non-wet areas. Kitchen/bathroom positions fixed, but living/bedroom layout flexible",
},

"TP-LOC-004": {
  tp_id: "TP-LOC-004",
  category: "Location & Ecosystem",
  sub_category: "Connectivity/Commute",
  objection_scenario: "Vicinity is too congested / Did not like vicinity",
  talking_point: "Highlight: 4 ENTRY/EXIT POINTS (traffic dispersal), SELF-SUSTAINING TOWNSHIP (reduces outside travel), CONNECTIVITY via Metro and Roads",
  key_data_points: "4 entry/exit points with traffic flow data, Township self-sufficiency (% of daily needs met inside), Metro Line 4 timeline, Road connectivity improvements",
  emotional_hook: "What looks congested from outside is actually designed for smooth living inside",
  logical_argument: "4 separate entry/exit points = no single choke point. Self-sustaining township = 95% daily needs inside, less outside travel. Metro Line 4 (2027) + road widening = external congestion reducing",
},

"TP-LOC-005": {
  tp_id: "TP-LOC-005",
  category: "Location & Ecosystem",
  sub_category: "Perceived Value of Location",
  objection_scenario: "Price for this location is way lower than other micro markets",
  talking_point: "Share price trends showing established markets have PEAKED OUT. Show scope of growth in your micro market due to scale of development",
  key_data_points: "Price trend comparison (5-year data), Established market growth ceiling, Emerging market growth potential, Development scale in your micro market",
  emotional_hook: "Lower price today doesn't mean lower value - it means higher growth potential",
  logical_argument: "Established micro markets have peaked: 5-7% annual growth max. Kolshet/Thane: 15-20% growth potential. The price difference IS the opportunity - you're getting in before the peak",
},

"TP-COMP-006": {
  tp_id: "TP-COMP-006",
  category: "Competition",
  sub_category: "Better Payment",
  objection_scenario: "Competitor has better payment schedule with lower/no loading",
  talking_point: "Highlight DELAY RISK when builder doesn't take money from clients - has to raise debt or use own funds. Feels lucrative now but project stands at HIGH RISK",
  key_data_points: "Competitor payment terms, Developer debt levels, Delay risk correlation with funding model, Construction progress comparison",
  emotional_hook: "A payment schedule that looks easy today can become a delayed home tomorrow",
  logical_argument: "Lower payment loading = developer must borrow at 12-14% or use own funds. High debt = construction slowdown risk. Check their current construction progress vs timeline. Our payment structure = sustainable delivery",
},

"TP-DEC-004": {
  tp_id: "TP-DEC-004",
  category: "Decision Process",
  sub_category: "Multiple Decision Makers",
  objection_scenario: "Have to bring parents or influencers to decide",
  talking_point: "Emphasize OFFER and UNIT might not be available when influencers come. Push for site visit or VC. Push for CLOSURE to get PRICE and EXACT UNIT",
  key_data_points: "Offer validity timeline, Unit availability status, Site visit scheduling, VC option",
  emotional_hook: "Your family's input matters. But this opportunity might not wait for everyone's schedule",
  logical_argument: "This offer is valid until [date]. This unit has [X] other interested families. Let's schedule your parents' visit for [date]. Meanwhile, let's lock THE PRICE AND EXACT UNIT with a token so you don't lose it",
},

"TP-DEC-005": {
  tp_id: "TP-DEC-005",
  category: "Decision Process",
  sub_category: "Site Visit/Unit Visit",
  objection_scenario: "Want to see actual unit or site before deciding",
  talking_point: "Site visit is ONLY POSSIBLE ONCE TOKEN IS GIVEN. Push for closure to get price and unit benefit. Then take client to project/unit",
  key_data_points: "Token amount (refundable), Site visit policy, Price lock benefit with token, Unit availability status",
  emotional_hook: "I want you to see everything. Here's how we can make that happen",
  logical_argument: "Site visit to construction area is only possible after token booking (₹[X], refundable). This also LOCKS YOUR PRICE and secures your exact unit. Once token is done, I'll personally take you for a complete site walkthrough",
},
```

### Section 2: NBA_RULES Matrix Updates (Lines ~461-1010)

#### Updates to Existing NBA Rules

**NBA-COL-001** (Lines ~597-608): Update data_points_required and specific_action
**NBA-COL-002** (Lines ~609-620): Update with CC/OC, Events, Retail
**NBA-COL-003** (Lines ~621-631): Add Estella upgrade, Outdoor Room
**NBA-COL-006** (Lines ~653-664): Add Anarock, Office space, Temple
**NBA-COL-009** (Lines ~695-704): Add cluster-wise breakdown
**NBA-COL-013** (Lines ~741-752): Add hearsay rebuttal, prominent developers
**NBA-COM-010** (Lines ~571-582): Add closure for price and unit
**NBA-OFF-001** (Lines ~767-778): Add face-to-face, management approval
**NBA-OFF-002** (Lines ~779-790): Add 0 stamp duty offer
**NBA-OFF-003** (Lines ~791-802): Add KL broker introduction
**NBA-OFF-006** (Lines ~827-838): Add developer modification, vastu consultant
**NBA-OFF-008** (Lines ~851-862): Add 'miss out' language

#### New NBA Rules to Add

```typescript
// NEW NBA Rules (Framework Corrections)
"NBA-COM-012": {
  nba_id: "NBA-COM-012",
  trigger_condition: "IF buyer needs to bring parents or influencers to decide",
  data_points_required: "Influencer relationship, Visit scheduling, Offer validity",
  persona_filter: "All",
  objection_category: "Decision Process",
  action_category: "COMMUNICATION",
  specific_action: "Emphasize OFFER and UNIT scarcity. Schedule influencer visit. Push for CLOSURE TO LOCK PRICE AND EXACT UNIT with token before they leave",
  escalation_trigger: "Influencer visit keeps getting delayed",
  fallback_action: "Send video walkthrough to influencers, maintain token pressure",
  linked_talking_points: ["TP-DEC-004"],
},

"NBA-COM-013": {
  nba_id: "NBA-COM-013",
  trigger_condition: "IF customer wants to see actual site or unit before deciding",
  data_points_required: "Token amount, Site visit policy, Unit availability",
  persona_filter: "All",
  objection_category: "Decision Process",
  action_category: "COMMUNICATION",
  specific_action: "Explain site visit requires TOKEN FIRST. Push for token to lock price and unit. Then arrange comprehensive site walkthrough",
  escalation_trigger: "Refuses token without site visit",
  fallback_action: "Offer Immensa/Sunrise delivered walkthrough as alternative proof, maintain token push",
  linked_talking_points: ["TP-DEC-005"],
},

"NBA-COL-015": {
  nba_id: "NBA-COL-015",
  trigger_condition: "IF objection = 'Vicinity is too congested' OR 'Did not like vicinity'",
  data_points_required: "4 entry/exit data, Township self-sufficiency %, Metro timeline, Road connectivity",
  persona_filter: "All",
  objection_category: "Location & Ecosystem",
  action_category: "CONTENT/COLLATERAL",
  specific_action: "Send township traffic flow map showing 4 ENTRY/EXIT POINTS. Show SELF-SUSTAINING TOWNSHIP data (95% daily needs inside). Include Metro Line 4 + road connectivity improvements",
  escalation_trigger: "Congestion concern persists",
  fallback_action: "Offer site visit during different times to show actual traffic flow",
  linked_talking_points: ["TP-LOC-004"],
},

"NBA-COL-016": {
  nba_id: "NBA-COL-016",
  trigger_condition: "IF objection = 'Privacy is top priority' AND unit_not_finalized",
  data_points_required: "Building gap measurements, Unit positioning details, Privacy-optimized unit list",
  persona_filter: "All",
  objection_category: "Inventory & Product",
  action_category: "CONTENT/COLLATERAL",
  specific_action: "Send building gap analysis with exact measurements. Show unit positioning diagrams for privacy comfort. List privacy-optimized units with pricing",
  escalation_trigger: "Still concerned about privacy",
  fallback_action: "Offer site visit to physically see building gaps and sight-lines",
  linked_talking_points: ["TP-INV-008"],
},

"NBA-COL-017": {
  nba_id: "NBA-COL-017",
  trigger_condition: "IF objection = 'Need bigger carpet' AND jodi_interest = False AND wants_builder_finish",
  data_points_required: "Jodi layout options, Customization possibilities, Market size comparison, Price comparison",
  persona_filter: "All",
  objection_category: "Inventory & Product",
  action_category: "CONTENT/COLLATERAL",
  specific_action: "Send JODI LAYOUT OPTIONS with customization possibilities. Compare market availability of desired size + pricing vs jodi total outflow. Show jodi benefits vs builder finish",
  escalation_trigger: "Still prefers builder finish",
  fallback_action: "Explore other projects or waitlist for larger units",
  linked_talking_points: ["TP-INV-007"],
},

"NBA-OFF-009": {
  nba_id: "NBA-OFF-009",
  trigger_condition: "IF requirement = 'Specific floor' AND floor_premium_concern = True",
  data_points_required: "Floor premium rates, Payment schedule options, View comparison by floor",
  persona_filter: "All",
  objection_category: "Inventory & Product",
  action_category: "OFFER",
  specific_action: "Offer AGGRESSIVE PAYMENT SCHEDULE to cover floor rise cost. Show view comparison justifying premium. Present floor premium breakdown",
  escalation_trigger: "Premium still unacceptable",
  fallback_action: "Show next best available floor or alternative wing with better view at lower floor",
  linked_talking_points: ["TP-INV-009"],
},

"NBA-OFF-010": {
  nba_id: "NBA-OFF-010",
  trigger_condition: "IF objection = 'Ventilation/sunlight in some rooms' AND flexibility_exists",
  data_points_required: "Unit benefits, Bareshell option availability, Modification limitations",
  persona_filter: "All",
  objection_category: "Inventory & Product",
  action_category: "OFFER",
  specific_action: "Highlight unit's other benefits. Offer BARESHELL UNIT post management approval where client can reconfigure (wet areas fixed, living/bedroom flexible)",
  escalation_trigger: "Bareshell not acceptable",
  fallback_action: "Show alternative units with better ventilation or accept the limitation with benefits focus",
  linked_talking_points: ["TP-INV-010"],
},

"NBA-OFF-011": {
  nba_id: "NBA-OFF-011",
  trigger_condition: "IF objection = 'Competitor has better payment schedule (lower loading)'",
  data_points_required: "Competitor payment terms, Developer debt analysis, Delay risk data",
  persona_filter: "Budget-conscious",
  objection_category: "Competition",
  action_category: "OFFER",
  specific_action: "Explain DELAY RISK: lower loading = developer borrows at 12-14% or uses own funds = high risk. Show our sustainable payment structure. Offer best possible terms within risk parameters",
  escalation_trigger: "Client wants matching terms regardless",
  fallback_action: "Offer best approved deviation, highlight delivery confidence",
  linked_talking_points: ["TP-COMP-006"],
},
```

### Section 3: OBJECTION_KEYWORDS Updates (Lines ~1095-1136)

Add new keywords for detection:
- Add "vicinity", "congested", "entry", "exit" to Location & Ecosystem
- Add "privacy", "gap", "sight-line" to Inventory & Product
- Add "floor rise", "floor premium", "ventilation", "sunlight", "bareshell" to Inventory & Product
- Add "jodi", "builder finish", "bigger carpet" to Inventory & Product
- Add "influencer", "parents", "site visit", "token" to Decision Process

### Section 4: Update NBA-COM-007 linked_talking_points

Add TP-ECO-011 to NBA-COM-007's linked_talking_points array (Line ~545).

---

## Framework Statistics After Update

| Category | Before | After |
|----------|--------|-------|
| Total Talking Points | 43 | 53 |
| Total NBA Rules | 49 | 57 |
| Content Updates Applied | 0 | 24 |
| New Scenarios Covered | 0 | 18 |

---

## Testing Recommendations

After deploying these changes:

1. **Verify TP loading**: Check that all 53 TPs are accessible via `getTalkingPointDef()`
2. **Verify NBA loading**: Check that all 57 NBAs are accessible via `getNBARuleDef()`
3. **Test new scenario detection**: Analyze leads with:
   - Vicinity congestion concerns
   - Privacy requirements
   - Floor preference objections
   - Influencer involvement
   - Site visit requests
4. **Re-analyze sample leads** to verify updated TPs (with new language like "miss out", "hearsay", "Anarock") are being generated
