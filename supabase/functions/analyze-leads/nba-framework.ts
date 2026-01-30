// ============= NBA & TALKING POINTS FRAMEWORK =============
// Decision tree based framework for generating contextualized NBAs and Talking Points

// ============= TYPE DEFINITIONS =============

export type ObjectionCategory =
  | "Economic Fit"
  | "Possession Timeline"
  | "Inventory & Product"
  | "Location & Ecosystem"
  | "Competition"
  | "Investment"
  | "Decision Process"
  | "Special Scenarios";

export type NBAActionType =
  | "COMMUNICATION"
  | "CONTENT/COLLATERAL"
  | "OFFER"
  | "FOLLOW-UP"
  | "ESCALATION";

export type PersonaId =
  | "Lifestyle Connoisseur"
  | "Aspirant Upgrader"
  | "Asset-Locked Upgrader"
  | "Vastu-Rigid Buyer"
  | "Settlement Seeker"
  | "Pragmatic Investor"
  | "Business Owner"
  | "Amara Density Escaper"
  | "Kalpataru Loyalist Upgrader"
  | "Parkcity Rental Converter"
  | "NRI/Out-of-City Relocator"
  | "First-Time Investor"
  | "Senior Citizen Self-Use";

export interface TalkingPointDef {
  tp_id: string;
  category: string;
  sub_category: string;
  objection_scenario: string;
  talking_point: string;
  key_data_points: string;
  emotional_hook: string;
  logical_argument: string;
  competitor_counter?: string;
}

export interface NBARule {
  nba_id: string;
  trigger_condition: string;
  data_points_required: string;
  persona_filter: string;
  objection_category: ObjectionCategory;
  action_category: NBAActionType;
  specific_action: string;
  escalation_trigger: string;
  fallback_action: string;
  linked_talking_points: string[];
}

export interface MatrixEntry {
  nba_id: string;
  tp_ids: string[];
  action_summary: string;
}

// ============= TALKING POINTS MATRIX (43 entries) =============

export const TALKING_POINTS: Record<string, TalkingPointDef> = {
  // Economic Fit - Pricing Gap Vs Perceived Value
  "TP-ECO-001": {
    tp_id: "TP-ECO-001",
    category: "Economic Fit",
    sub_category: "Pricing Gap Vs Perceived Value",
    objection_scenario: "Wants RTMI at Under Construction price",
    talking_point: "Show value of money earned by investing the price difference during construction period",
    key_data_points: "UC price vs RTMI price gap (~15-20%), Investment returns at 8-10% p.a., 3-year construction period ROI",
    emotional_hook: "Your money works for you while your dream home is being built",
    logical_argument: "If RTMI is ₹2.3Cr and UC is ₹1.9Cr, ₹40L invested at 10% for 3 years = ₹53L. Net saving of ₹13L",
  },
  "TP-ECO-002": {
    tp_id: "TP-ECO-002",
    category: "Economic Fit",
    sub_category: "Pricing Gap Vs Perceived Value",
    objection_scenario: "Wants RTMI at Under Construction price",
    talking_point: "Highlight inventory choice advantage - UC gives access to preferred floor, view, unit",
    key_data_points: "GCP-facing units premium, Higher floor availability in UC vs RTMI",
    emotional_hook: "Your family deserves the exact home they want, not what's leftover",
    logical_argument: "RTMI inventory is limited to unsold/resale units. UC lets you choose the perfect unit for your family's needs",
  },
  "TP-ECO-003": {
    tp_id: "TP-ECO-003",
    category: "Economic Fit",
    sub_category: "Pricing Gap Vs Perceived Value",
    objection_scenario: "Getting cheaper at competition",
    talking_point: "Show lifestyle and gentry comparison - who your neighbors will be",
    key_data_points: "Kalpataru buyer profile vs competitor, Township amenities density, Families per sqft metric",
    emotional_hook: "Your children's friends, your social circle - this is defined by who lives around you",
    logical_argument: "Lodha Amara: 4864 units in 40 towers = high density. Eternia: 1266 units in 10 towers = exclusive community",
    competitor_counter: "Lodha Amara ~₹17,450/sqft but leakage complaints, 35+ tower density, Dosti ~₹17,000/sqft but lower quality fittings",
  },
  "TP-ECO-004": {
    tp_id: "TP-ECO-004",
    category: "Economic Fit",
    sub_category: "Pricing Gap Vs Perceived Value",
    objection_scenario: "Getting cheaper at competition",
    talking_point: "Highlight future appreciation potential based on micro-market development",
    key_data_points: "Kolshet Road price growth trends, Metro Line 4 by 2027, Infrastructure pipeline",
    emotional_hook: "You're not buying today's location, you're investing in tomorrow's prime address",
    logical_argument: "Kolshet grew from ₹8K/sqft (2018) to ₹23K/sqft (2025) = 187% in 7 years. Infrastructure still ramping up",
    competitor_counter: "Established locations like Hiranandani have peaked. Growth ceiling already hit",
  },
  "TP-ECO-005": {
    tp_id: "TP-ECO-005",
    category: "Economic Fit",
    sub_category: "Pricing Gap Vs Perceived Value",
    objection_scenario: "Better location at similar budget",
    talking_point: "Challenge definition of 'better location' - peaked vs emerging",
    key_data_points: "Price appreciation data last 5 years, Upcoming infra: Metro, DP roads, Commercial zones",
    emotional_hook: "An established location means established prices. Your appreciation happened for someone else",
    logical_argument: "Established micro-market: 5-7% annual appreciation. Emerging Kolshet: 15-20% potential",
  },
  "TP-ECO-006": {
    tp_id: "TP-ECO-006",
    category: "Economic Fit",
    sub_category: "Payment Schedule",
    objection_scenario: "Wants subvention without cost loading",
    talking_point: "Explain business economics transparently, then offer structured alternatives",
    key_data_points: "Builder cost of funds, Subvention loading calculation, Alternative payment structures",
    emotional_hook: "I understand you want financial ease. Let me show you how we can structure this intelligently",
    logical_argument: "Pure subvention costs us ~2-3% of deal value. We can offer custom payment plans that reduce your outflow without this loading",
  },
  "TP-ECO-007": {
    tp_id: "TP-ECO-007",
    category: "Economic Fit",
    sub_category: "Payment Schedule",
    objection_scenario: "CLP deviation making price go beyond budget",
    talking_point: "Suggest floor/unit adjustment to absorb deviation cost",
    key_data_points: "Floor premium rates, Unit alternatives with payment flexibility",
    emotional_hook: "Let's find the sweet spot where your budget works and you don't compromise on your home",
    logical_argument: "A 2-floor lower unit saves ₹4-6L which covers the CLP deviation. Same view, same layout, better terms",
    competitor_counter: "Competition may offer lower loading but check their construction progress and delay history",
  },
  "TP-ECO-008": {
    tp_id: "TP-ECO-008",
    category: "Economic Fit",
    sub_category: "Cashflow/EMI Stress",
    objection_scenario: "OCR contribution issue",
    talking_point: "Suggest microfinance products or structured payment plans based on income cycle",
    key_data_points: "Personal loan rates, Bullet payment options, Appraisal-linked payment plans",
    emotional_hook: "Your career is on an upward trajectory. Let's align payments with your growth",
    logical_argument: "Bullet plan: Pay 15% now, 5% after your appraisal (6 months), balance at milestones",
  },
  "TP-ECO-009": {
    tp_id: "TP-ECO-009",
    category: "Economic Fit",
    sub_category: "Cashflow/EMI Stress",
    objection_scenario: "Loan eligibility issue",
    talking_point: "Explore NBFC options, co-applicant addition, or builder subvention with value pitch",
    key_data_points: "NBFC eligibility criteria vs banks, Co-applicant benefit, Property value projection",
    emotional_hook: "There's always a way when the home is right. Let me connect you with our banking partners",
    logical_argument: "NBFCs like Bajaj, Tata Capital have different criteria. Adding spouse as co-applicant can increase eligibility by 40-50%",
  },
  "TP-ECO-010": {
    tp_id: "TP-ECO-010",
    category: "Economic Fit",
    sub_category: "Cashflow/EMI Stress",
    objection_scenario: "CSOP (Current Sale of Property) required",
    talking_point: "Suggest conditional booking with timeline, connect with resale partners",
    key_data_points: "Conditional booking terms, Partner resale agency track record, Market sale timeline for their property type",
    emotional_hook: "Your current home's value is your stepping stone. Let's unlock it together",
    logical_argument: "Conditional booking: ₹1L locks unit for 60 days. Our partner agency sells properties in Borivali/Dahisar in avg 45 days",
  },

  // Possession Timeline
  "TP-POS-001": {
    tp_id: "TP-POS-001",
    category: "Possession Timeline",
    sub_category: "Immediate Need (RTMI)",
    objection_scenario: "Staying on rent, can't afford EMI + rent",
    talking_point: "Show rent paid vs price saving + appreciation math. Compare with subvention option",
    key_data_points: "Current rent amount, UC price advantage, 20:80 pre-EMI vs rent calculation",
    emotional_hook: "Every rent check is money that builds someone else's asset. Let's change that equation",
    logical_argument: "Rent ₹35K/month = ₹4.2L/year = ₹12.6L in 3 years GONE. UC pre-EMI under 20:80 = ₹8-10K/month. Gap = ₹25K extra for 3 years to OWN an appreciating asset",
    competitor_counter: "RTMI premium of ₹30-50L vs this ₹9L extra outflow over 3 years - which makes sense?",
  },
  "TP-POS-002": {
    tp_id: "TP-POS-002",
    category: "Possession Timeline",
    sub_category: "Immediate Need (RTMI)",
    objection_scenario: "Sitting on capital gains from house sale",
    talking_point: "Show capital gains investment options while buying UC",
    key_data_points: "Capital gains bond rates, Section 54 benefits, UC price lock advantage",
    emotional_hook: "Your capital gains are a springboard, not a deadline. Let's optimize both",
    logical_argument: "Invest capital gains in 54EC bonds (5.25% tax-free) for 5 years. Buy UC at today's price. Net result: Tax saved + appreciation earned",
  },
  "TP-POS-003": {
    tp_id: "TP-POS-003",
    category: "Possession Timeline",
    sub_category: "Long-Term Fatigue",
    objection_scenario: "Possession too late (2027-2030)",
    talking_point: "Show construction progress, RERA timeline compliance, subvention as risk mitigation",
    key_data_points: "Current construction % vs RERA timeline, Monthly drone footage, Delivered tower references",
    emotional_hook: "Let me show you something real - not promises, progress",
    logical_argument: "Tower C: 98% structural complete, Tower D: 96%. We're AHEAD of RERA timeline by 5%. Under 20:80, you pay 80% only on possession - minimal risk",
    competitor_counter: "Compare with Immensa delivered on time. Same developer, same standards",
  },
  "TP-POS-004": {
    tp_id: "TP-POS-004",
    category: "Possession Timeline",
    sub_category: "Long-Term Fatigue",
    objection_scenario: "Developer delay history concern (Immensa)",
    talking_point: "Address Immensa transparently, show Eternia's different trajectory",
    key_data_points: "Immensa specific delay causes (COVID, approvals), Eternia current progress, Independent verification",
    emotional_hook: "I won't dismiss your concern - let me address it directly with facts",
    logical_argument: "Immensa faced 2020 COVID + municipal delays (documented). Eternia started 2022 with learnings applied. Current progress: 40% complete vs 35% RERA requirement = AHEAD",
    competitor_counter: "Would you like to speak with Immensa residents? Or visit delivered towers?",
  },

  // Inventory & Product
  "TP-INV-001": {
    tp_id: "TP-INV-001",
    category: "Inventory & Product",
    sub_category: "Layout/Size",
    objection_scenario: "Space perception - rooms feel small",
    talking_point: "Show zero-wastage efficiency vs competitor wasted space",
    key_data_points: "Carpet efficiency %, Competitor passage wastage metrics, Furniture layout demo",
    emotional_hook: "It's not about sqft - it's about how you live in every inch",
    logical_argument: "Our 920sqft has 15% more usable space than competitor's 1000sqft - they waste 150sqft in passages. Sample flat proves this with furniture placement",
    competitor_counter: "Dosti/Runwal layouts waste 12-18% in passages. Our zero-wastage design maximizes every foot",
  },
  "TP-INV-002": {
    tp_id: "TP-INV-002",
    category: "Inventory & Product",
    sub_category: "Layout/Size",
    objection_scenario: "Need unit with deck",
    talking_point: "Break down deck cost separately, show aggressive payment structure or alternative larger unit without deck",
    key_data_points: "Deck premium calculation, Alternative unit comparison, Payment structure options",
    emotional_hook: "The deck is your outdoor room - let's see how to make it work for your budget",
    logical_argument: "Deck adds ₹8-12L premium. Option A: Aggressive payment covers this. Option B: 796sqft without deck = more indoor space at same price",
  },
  "TP-INV-003": {
    tp_id: "TP-INV-003",
    category: "Inventory & Product",
    sub_category: "View Preference",
    objection_scenario: "Want clear views, no building in front",
    talking_point: "Show wind/sunlight analysis, building gap measurements, price comparison",
    key_data_points: "Building gap in meters, Sunlight hours analysis, GCP-facing premium justification",
    emotional_hook: "Views aren't just aesthetic - they're about light, air, and your daily wellbeing",
    logical_argument: "Gap between Tower C and D = 35 meters - significantly more than BIS minimum. Every unit gets 4+ hours direct sunlight. GCP-facing adds ₹15L but gives unobstructed 20-acre park view",
    competitor_counter: "Lodha Amara tower gaps are tighter due to 35+ tower density",
  },
  "TP-INV-004": {
    tp_id: "TP-INV-004",
    category: "Inventory & Product",
    sub_category: "Vastu Compliance",
    objection_scenario: "Kitchen/entry direction issue",
    talking_point: "Acknowledge vastu importance, show compliant inventory, highlight scarcity premium",
    key_data_points: "Vastu-compliant unit list, Direction compass on floor plans, Limited availability messaging",
    emotional_hook: "Your family's harmony matters. Let me show you our vastu-compliant options",
    logical_argument: "We have 8 units that are fully NE/E facing with kitchen in SE corner. These are premium due to limited availability and high demand. ₹2.45Cr for 1189sqft compliant unit",
  },
  "TP-INV-005": {
    tp_id: "TP-INV-005",
    category: "Inventory & Product",
    sub_category: "Amenities",
    objection_scenario: "Desired amenities unavailable",
    talking_point: "Show cluster-wise amenity distribution, scale comparison",
    key_data_points: "Olympic pool dimensions, Amenity per resident ratio, Clubhouse spread",
    emotional_hook: "Let me show you what 100+ acres of township means for your daily life",
    logical_argument: "50m Olympic pool (vs competitor 25m), 20-acre GCP vs their 2-acre garden, 1.5-acre clubhouse, tennis/squash/badminton courts - ratio is 3x better than high-density projects",
  },
  "TP-INV-006": {
    tp_id: "TP-INV-006",
    category: "Investment",
    sub_category: "ROI Focus",
    objection_scenario: "Rental yield and ROI questions",
    talking_point: "Show rental data from Immensa/Sunrise, infrastructure appreciation thesis",
    key_data_points: "Current rental rates in township, Metro appreciation data from other cities, Price lock advantage",
    emotional_hook: "Real estate is about two things: rental yield today and appreciation tomorrow. We score on both",
    logical_argument: "Immensa 2BHK rentals: ₹35-40K/month = 2.8-3.2% yield. Metro Line 4 impact: Delhi/Bengaluru data shows 20-30% appreciation within 2 years of metro. Price locked now at UC rates",
  },

  // Location & Ecosystem
  "TP-LOC-001": {
    tp_id: "TP-LOC-001",
    category: "Location & Ecosystem",
    sub_category: "Connectivity/Commute",
    objection_scenario: "Want better work/school connectivity",
    talking_point: "Show upcoming infrastructure impact on commute times",
    key_data_points: "Metro Line 4 stations and timeline, Current vs future commute times, DP road network",
    emotional_hook: "A home is a 20-year decision. The location you buy today will transform in 5 years",
    logical_argument: "Metro Line 4 (2027): Balkum station 800m from township. BKC commute drops from 60 min to 35 min. Poddar School 2km, Vasant Vihar 3km",
  },
  "TP-LOC-002": {
    tp_id: "TP-LOC-002",
    category: "Location & Ecosystem",
    sub_category: "Connectivity/Commute",
    objection_scenario: "Have to rebuild ecosystem (schools, doctors, social)",
    talking_point: "Show self-sustaining township infrastructure",
    key_data_points: "Township retail, F&B, schools within complex, 4 entry points",
    emotional_hook: "You're not moving to a new location - you're moving to a self-contained city within a city",
    logical_argument: "Parkcity has: High Street Retail, F&B zone, proposed school within township, 4 entry/exit points, temple. 95% of daily needs within walking distance",
  },
  "TP-LOC-003": {
    tp_id: "TP-LOC-003",
    category: "Location & Ecosystem",
    sub_category: "Perceived Value of Location",
    objection_scenario: "Price for this location seems low vs premium areas",
    talking_point: "Show price trend comparison and growth potential",
    key_data_points: "Kolshet vs Hiranandani vs Powai price trends, Infrastructure investment pipeline",
    emotional_hook: "Premium locations are premium because they WERE emerging locations 15 years ago",
    logical_argument: "Kolshet: ₹23K/sqft growing 15% annually. Hiranandani: ₹35K/sqft but only 3-5% growth. ₹12K/sqft difference × 1000sqft = ₹1.2Cr saved, with higher appreciation runway",
  },

  // Competition
  "TP-COMP-001": {
    tp_id: "TP-COMP-001",
    category: "Competition",
    sub_category: "Livability Display",
    objection_scenario: "Competitor delivered, can see finished product",
    talking_point: "Show walkthrough of delivered Immensa/Sunrise, highlight scale and quality difference",
    key_data_points: "Density comparison, Quality comparison (Geberit vs standard), Family per sqft metric",
    emotional_hook: "A delivered project lets you see what you'll get. Let me show you OUR delivered quality at Immensa",
    logical_argument: "Immensa delivered: Same Geberit fittings, same door quality, same Kalpataru standard. Plus: Our density is 2.5x lower than Amara",
    competitor_counter: "Lodha Amara: 4864 units/40 acres = 121 families/acre. Kalpataru: 1266 units/10 acres = 126 families/acre BUT within 100+ acre township with 20-acre park",
  },
  "TP-COMP-002": {
    tp_id: "TP-COMP-002",
    category: "Competition",
    sub_category: "Track Record",
    objection_scenario: "Competitor has better delivery track record",
    talking_point: "Show Kalpataru's overall delivery record, address specific project concerns",
    key_data_points: "55 years brand history, Zero safety incidents, Delivered project testimonials",
    emotional_hook: "Track record isn't just about one project - it's 55 years of building trust",
    logical_argument: "Kalpataru: 113+ projects delivered since 1969. Zero major safety incidents. Immensa/Sunrise delivered. Happy customer testimonials available",
  },
  "TP-COMP-003": {
    tp_id: "TP-COMP-003",
    category: "Competition",
    sub_category: "Better Product",
    objection_scenario: "Competitor has better layout/decks at lower price",
    talking_point: "Highlight layout efficiency, quality difference, total cost of ownership",
    key_data_points: "Layout efficiency %, Material quality comparison, 20-year maintenance cost projection",
    emotional_hook: "Lower price today, higher cost over 20 years. Let me show you why",
    logical_argument: "Competitor: Standard Jaquar fittings (replacement in 7-10 years). Kalpataru: Geberit (25-year warranty). Competitor window quality = condensation issues in monsoon. Door thickness: 32mm vs their 25mm",
  },
  "TP-COMP-004": {
    tp_id: "TP-COMP-004",
    category: "Competition",
    sub_category: "Better Payment",
    objection_scenario: "Competitor offering no-cost subvention",
    talking_point: "Explain risk of free subvention - debt-funded construction",
    key_data_points: "Developer debt levels, Construction funding source, Delay risk correlation",
    emotional_hook: "Free subvention sounds great until you understand who's paying for it - and the risk that creates",
    logical_argument: "No-cost subvention = developer borrowing at 12-14% to fund construction. High debt = delay risk. Check their debt-equity ratio and past delivery timelines",
    competitor_counter: "Our 20:80 at small loading = transparent, sustainable, on-time delivery",
  },
  "TP-COMP-005": {
    tp_id: "TP-COMP-005",
    category: "Competition",
    sub_category: "Location Bias",
    objection_scenario: "Competitor location perceived as more premium",
    talking_point: "Show infrastructure growth comparison, price trajectory",
    key_data_points: "Upcoming infra in Kolshet, Price CAGR comparison, Employment hub proximity",
    emotional_hook: "Premium is what you make of it. Let me show you where the next premium is being built",
    logical_argument: "Today's premium (Powai/Hiranandani) was once considered 'far'. Kolshet has better connectivity today than Powai had 15 years ago. Metro + DP roads + IT parks = new premium",
  },

  // Decision Process
  "TP-DEC-001": {
    tp_id: "TP-DEC-001",
    category: "Decision Process",
    sub_category: "Multiple Decision Makers",
    objection_scenario: "Need to visit competition first",
    talking_point: "Create urgency with current offers, offer to set up competition comparison",
    key_data_points: "Current offer validity, Price escalation schedule, Unit availability status",
    emotional_hook: "Absolutely compare - that's smart buying. But let me help you not miss what's available now",
    logical_argument: "Current festive offer valid until [date]. Prices increase ₹5-8L next month. Unit A-805 has 2 other interested families. I can set up comparison visits - but let's lock this price today with ₹1L refundable token",
  },
  "TP-DEC-002": {
    tp_id: "TP-DEC-002",
    category: "Decision Process",
    sub_category: "Multiple Decision Makers",
    objection_scenario: "Not sure on exact area requirement",
    talking_point: "Work backwards from family size and lifestyle to determine right size",
    key_data_points: "Family size to area mapping, Room usage planning, Future family planning",
    emotional_hook: "Let's work this out together based on how your family actually lives",
    logical_argument: "Family of 4: Parents need privacy, kids need study space. 2BHK 700+ sqft works if kids <10. 3BHK recommended if kids >10 or parents staying. What's your family structure?",
  },
  "TP-DEC-003": {
    tp_id: "TP-DEC-003",
    category: "Decision Process",
    sub_category: "Multiple Decision Makers",
    objection_scenario: "Looking on behalf of someone else",
    talking_point: "Create urgency, push for decision-maker visit",
    key_data_points: "Offer validity, Unit scarcity, VC option for remote decision makers",
    emotional_hook: "The person making this decision deserves to see this themselves. Can we arrange that?",
    logical_argument: "I can do a video call with the decision maker to walk them through virtually. But this unit and this offer won't wait. Can we schedule for tomorrow?",
  },

  // Special Scenarios
  "TP-SPEC-001": {
    tp_id: "TP-SPEC-001",
    category: "Special Scenarios",
    sub_category: "Lodha Amara Upgrader",
    objection_scenario: "Currently living in Amara, want less density",
    talking_point: "Use density escape narrative, show GCP size vs Amara amenities",
    key_data_points: "Tower count comparison, Families per acre, GCP size vs Amara green space",
    emotional_hook: "You know exactly what high-density living feels like. Now imagine the opposite",
    logical_argument: "Amara: 35+ towers, 4800+ families, pool always crowded. Parkcity: 10 towers in Eternia, 20-acre PRIVATE park, Olympic pool with 3x better ratio. You've lived the crowding - time to escape",
    competitor_counter: "Your Amara experience is your best sales pitch for Eternia",
  },
  "TP-SPEC-002": {
    tp_id: "TP-SPEC-002",
    category: "Special Scenarios",
    sub_category: "Existing Kalpataru Customer Upgrade",
    objection_scenario: "Own Eternia/Immensa unit, want to upgrade",
    talking_point: "Acknowledge loyalty, show upgrade path, offer preferential terms",
    key_data_points: "Upgrade path options, Loyalty benefits, Same township convenience",
    emotional_hook: "You already know the Kalpataru quality. Now let's find your upgrade within the same family",
    logical_argument: "From 538sqft to 920sqft - same township, same friends, better space. We can help with your current unit sale and priority unit allocation",
  },
  "TP-SPEC-003": {
    tp_id: "TP-SPEC-003",
    category: "Special Scenarios",
    sub_category: "NRI/Out-of-City Buyer",
    objection_scenario: "Based in Hyderabad/Pune/abroad, relocating",
    talking_point: "Emphasize remote buying support, show digital walkthrough capabilities",
    key_data_points: "Video call options, POA process, NRI payment structures, Location advantages for eventual move",
    emotional_hook: "Distance shouldn't stop you from securing the right home. Let me show you how we support NRI buyers",
    logical_argument: "Virtual tour, recorded sample flat walkthrough, POA process for registration, NRI-compliant payment channels. Many of our buyers are based abroad and we handle everything",
  },
  "TP-SPEC-004": {
    tp_id: "TP-SPEC-004",
    category: "Special Scenarios",
    sub_category: "Immensa Rental Customer",
    objection_scenario: "Renting in Immensa, looking to buy",
    talking_point: "Leverage existing experience, show value of ownership vs rent",
    key_data_points: "Current rent vs EMI comparison, Same amenity access, Appreciation since they started renting",
    emotional_hook: "You already live the Parkcity life. Why not own it?",
    logical_argument: "You're paying ₹35K rent. Your neighbor who bought 2 years ago is paying ₹30K EMI AND building equity. Property appreciated ₹40L since. Same lifestyle, different wealth trajectory",
  },
  "TP-SPEC-005": {
    tp_id: "TP-SPEC-005",
    category: "Special Scenarios",
    sub_category: "Senior Citizen Urgency",
    objection_scenario: "Buying for 75+ parents, need immediate",
    talking_point: "IMMEDIATE pivot to RTMI/resale options within Parkcity",
    key_data_points: "Immensa/Sunrise ready inventory, Same amenity access, Ground floor/lift proximity options",
    emotional_hook: "Your parents' comfort can't wait 3 years. Let me show you what's ready NOW in the same township",
    logical_argument: "STOP Eternia pitch immediately. Immensa has ready units same quality, same township access. Ground floor available. OC received. Your parents can move in 60 days",
    competitor_counter: "Never pitch UC to 75+ immediate need. 0% conversion. Redirect to resale immediately",
  },
};

// ============= NBA RULES MATRIX (49 entries) =============

export const NBA_RULES: Record<string, NBARule> = {
  // Communication Actions
  "NBA-COM-001": {
    nba_id: "NBA-COM-001",
    trigger_condition: "IF lead_stage = 'Post Site Visit' AND days_since_visit > 1 AND days_since_visit <= 3",
    data_points_required: "Visit date, Contact number, Interested units",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "COMMUNICATION",
    specific_action: "Call lead within 24-72 hours to gauge interest and address concerns",
    escalation_trigger: "No response after 3 call attempts",
    fallback_action: "Send WhatsApp message with unit photos",
    linked_talking_points: [],
  },
  "NBA-COM-002": {
    nba_id: "NBA-COM-002",
    trigger_condition: "IF objection = 'Budget' AND enrichment_data.income_verified = True AND income < budget_requirement * 0.3",
    data_points_required: "Verified income, Stated budget, Required budget for interested unit",
    persona_filter: "Aspirant Upgrader, Asset-Locked",
    objection_category: "Economic Fit",
    action_category: "COMMUNICATION",
    specific_action: "Schedule financial consultation call to discuss realistic options",
    escalation_trigger: "Client insists on unaffordable unit",
    fallback_action: "Redirect to Primera project (lower price point)",
    linked_talking_points: ["TP-ECO-003", "TP-ECO-007"],
  },
  "NBA-COM-003": {
    nba_id: "NBA-COM-003",
    trigger_condition: "IF objection = 'Timeline' AND reason = 'Senior Citizen (75+)'",
    data_points_required: "Age of end user, Urgency level, Budget confirmed",
    persona_filter: "Settlement Seeker",
    objection_category: "Possession Timeline",
    action_category: "COMMUNICATION",
    specific_action: "IMMEDIATE call to pivot conversation to RTMI/Resale options",
    escalation_trigger: "N/A - This is critical redirection",
    fallback_action: "Never pitch UC to this segment",
    linked_talking_points: ["TP-SPEC-005"],
  },
  "NBA-COM-004": {
    nba_id: "NBA-COM-004",
    trigger_condition: "IF source = 'Referral' AND referrer = 'Existing Customer'",
    data_points_required: "Referrer details, Referrer unit, Relationship",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "COMMUNICATION",
    specific_action: "Priority callback within 4 hours, mention referrer connection",
    escalation_trigger: "No response after 2 attempts",
    fallback_action: "Contact referrer for warm introduction",
    linked_talking_points: [],
  },
  "NBA-COM-005": {
    nba_id: "NBA-COM-005",
    trigger_condition: "IF lead_location = 'Out of City/NRI' AND interest_level = 'High'",
    data_points_required: "Current location, Relocation timeline, Preferred communication channel",
    persona_filter: "NRI/Out-of-City Buyer",
    objection_category: "Special Scenarios",
    action_category: "COMMUNICATION",
    specific_action: "Schedule video call for virtual site tour",
    escalation_trigger: "Timezone issues",
    fallback_action: "Send recorded walkthrough video + follow up",
    linked_talking_points: ["TP-SPEC-003"],
  },
  "NBA-COM-006": {
    nba_id: "NBA-COM-006",
    trigger_condition: "IF objection = 'Wants RTMI at UC price' AND timeline_flexible = True",
    data_points_required: "Current rent, UC vs RTMI price gap, Investment return assumptions",
    persona_filter: "All except Settlement Seeker",
    objection_category: "Economic Fit",
    action_category: "COMMUNICATION",
    specific_action: "Explain UC value proposition: price saving + investment returns + inventory choice advantage",
    escalation_trigger: "Absolutely needs immediate possession",
    fallback_action: "Redirect to RTMI/resale if timeline non-negotiable",
    linked_talking_points: ["TP-ECO-001", "TP-ECO-002"],
  },
  "NBA-COM-007": {
    nba_id: "NBA-COM-007",
    trigger_condition: "IF objection = 'Better location elsewhere at similar budget'",
    data_points_required: "Mentioned location, Price comparison, Growth potential data",
    persona_filter: "All",
    objection_category: "Economic Fit",
    action_category: "COMMUNICATION",
    specific_action: "Challenge 'better location' definition - established = peaked. Show emerging vs established growth math",
    escalation_trigger: "Emotional attachment to other location",
    fallback_action: "Acknowledge and focus on other value props",
    linked_talking_points: ["TP-ECO-005"],
  },
  "NBA-COM-008": {
    nba_id: "NBA-COM-008",
    trigger_condition: "IF objection = 'Competitor offering subvention without cost loading'",
    data_points_required: "Competitor subvention terms, Risk explanation, Our subvention with loading value",
    persona_filter: "Budget-conscious, Risk-averse",
    objection_category: "Competition",
    action_category: "COMMUNICATION",
    specific_action: "Explain debt-funded construction risk. Show correlation between free subvention and delay risk",
    escalation_trigger: "Client wants free subvention regardless",
    fallback_action: "Offer best possible subvention terms with minimal loading",
    linked_talking_points: ["TP-COMP-004"],
  },
  "NBA-COM-009": {
    nba_id: "NBA-COM-009",
    trigger_condition: "IF uncertainty = 'Not sure what carpet area needed'",
    data_points_required: "Family size, Lifestyle needs, Current residence size, Future plans",
    persona_filter: "First-time buyers, Upgraders",
    objection_category: "Decision Process",
    action_category: "COMMUNICATION",
    specific_action: "Consultative discovery: Family size → Room needs → Lifestyle → Budget alignment. Guide to right size",
    escalation_trigger: "Still confused after consultation",
    fallback_action: "Suggest visiting multiple unit types to feel the space",
    linked_talking_points: ["TP-DEC-002"],
  },
  "NBA-COM-010": {
    nba_id: "NBA-COM-010",
    trigger_condition: "IF buyer_type = 'Proxy buyer - looking for someone else'",
    data_points_required: "Actual decision maker details, Relationship, Decision maker availability",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "COMMUNICATION",
    specific_action: "Push for decision maker visit OR VC. Create urgency with offer validity and unit scarcity",
    escalation_trigger: "Decision maker unavailable for extended period",
    fallback_action: "Send comprehensive material for proxy to share, schedule future date",
    linked_talking_points: ["TP-DEC-003"],
  },
  "NBA-COM-011": {
    nba_id: "NBA-COM-011",
    trigger_condition: "IF lead_location = 'NRI' OR 'Out of city' AND cannot_visit_immediately",
    data_points_required: "Current location, Relocation timeline, VC capability, POA process awareness",
    persona_filter: "NRI/Out-of-City Relocator",
    objection_category: "Special Scenarios",
    action_category: "COMMUNICATION",
    specific_action: "Offer comprehensive remote buying support: Virtual tour, Recorded walkthrough, POA process, NRI payment channels",
    escalation_trigger: "Insists on physical visit only",
    fallback_action: "Schedule for next India visit, send material to review meanwhile",
    linked_talking_points: ["TP-SPEC-003"],
  },

  // Content/Collateral Actions
  "NBA-COL-001": {
    nba_id: "NBA-COL-001",
    trigger_condition: "IF objection = 'Price Higher than Competition' AND competitor_mentioned IN ['Lodha', 'Dosti', 'Runwal']",
    data_points_required: "Competitor name, Competitor project, Price quoted by competitor",
    persona_filter: "All",
    objection_category: "Competition",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send competitor comparison PDF within 2 hours of conversation",
    escalation_trigger: "No engagement with PDF",
    fallback_action: "Schedule call to walk through comparison together",
    linked_talking_points: ["TP-ECO-003", "TP-COMP-003"],
  },
  "NBA-COL-002": {
    nba_id: "NBA-COL-002",
    trigger_condition: "IF objection = 'Possession Timeline' AND concern = 'Delay Fear'",
    data_points_required: "Specific concern (Immensa reference?), Current construction knowledge",
    persona_filter: "All",
    objection_category: "Possession Timeline",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send construction progress report + drone footage link",
    escalation_trigger: "Continued skepticism",
    fallback_action: "Offer site visit to show live construction",
    linked_talking_points: ["TP-POS-003", "TP-POS-004"],
  },
  "NBA-COL-003": {
    nba_id: "NBA-COL-003",
    trigger_condition: "IF objection = 'Rooms Small' AND sample_flat_visit = False",
    data_points_required: "Interested carpet area, Current residence size",
    persona_filter: "Aspirant Upgrader, Lifestyle Connoisseur",
    objection_category: "Inventory & Product",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send furniture layout plan + sample flat photos with measurements",
    escalation_trigger: "Still concerned about size",
    fallback_action: "Schedule sample flat visit as priority",
    linked_talking_points: ["TP-INV-001"],
  },
  "NBA-COL-004": {
    nba_id: "NBA-COL-004",
    trigger_condition: "IF interest = 'GCP View' AND unit_not_finalized",
    data_points_required: "View preference, Budget range, Floor preference",
    persona_filter: "Lifestyle Connoisseur",
    objection_category: "Inventory & Product",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send GCP-facing unit photos from actual floor perspective + availability list",
    escalation_trigger: "Price objection on premium",
    fallback_action: "Show value calculation of GCP premium",
    linked_talking_points: ["TP-INV-003"],
  },
  "NBA-COL-005": {
    nba_id: "NBA-COL-005",
    trigger_condition: "IF objection = 'Quality Concern' AND roots_visited = False",
    data_points_required: "Specific quality concern, Competition quality reference",
    persona_filter: "All",
    objection_category: "Competition",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send Geberit vs competitor fittings comparison + Roots exhibition video",
    escalation_trigger: "Cannot visit Roots",
    fallback_action: "Arrange video call walkthrough of Roots",
    linked_talking_points: ["TP-COMP-003"],
  },
  "NBA-COL-006": {
    nba_id: "NBA-COL-006",
    trigger_condition: "IF persona = 'Pragmatic Investor' AND ROI_questions = True",
    data_points_required: "Investment goals, Rental yield expectations, Time horizon",
    persona_filter: "Pragmatic Investor",
    objection_category: "Investment",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send rental yield calculation sheet + Immensa rental data + Metro appreciation thesis",
    escalation_trigger: "Yield expectations unrealistic",
    fallback_action: "Educate on realistic RE yields vs other asset classes",
    linked_talking_points: ["TP-INV-006"],
  },
  "NBA-COL-007": {
    nba_id: "NBA-COL-007",
    trigger_condition: "IF objection = 'Competition cheaper' AND objection_type = 'Value perception'",
    data_points_required: "Competitor price, Kolshet growth data, Infrastructure pipeline",
    persona_filter: "All",
    objection_category: "Economic Fit",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send micro-market appreciation data + infrastructure development map + price trajectory comparison",
    escalation_trigger: "Only focused on today's price",
    fallback_action: "Pivot to quality/lifestyle differentiation",
    linked_talking_points: ["TP-ECO-004"],
  },
  "NBA-COL-008": {
    nba_id: "NBA-COL-008",
    trigger_condition: "IF funding_source = 'Capital gains from property sale' AND timeline_concern = True",
    data_points_required: "Capital gains amount, Sale timeline, 54EC bond awareness",
    persona_filter: "Asset-Locked, Pragmatic Investor",
    objection_category: "Possession Timeline",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send capital gains optimization guide: 54EC bonds + UC price lock + appreciation math",
    escalation_trigger: "Tax advisor recommends immediate RTMI",
    fallback_action: "Respect tax advice, offer RTMI options",
    linked_talking_points: ["TP-POS-002"],
  },
  "NBA-COL-009": {
    nba_id: "NBA-COL-009",
    trigger_condition: "IF objection = 'Desired amenity not available' OR amenity_comparison_with_competitor",
    data_points_required: "Desired amenity, Township amenity list, Competitor amenity comparison",
    persona_filter: "Lifestyle Connoisseur, Amenity-focused",
    objection_category: "Inventory & Product",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send cluster-wise amenity breakdown + amenity-per-resident ratio + scale comparison with competitors",
    escalation_trigger: "Specific amenity critically missing",
    fallback_action: "Acknowledge gap, highlight compensating features",
    linked_talking_points: ["TP-INV-005"],
  },
  "NBA-COL-010": {
    nba_id: "NBA-COL-010",
    trigger_condition: "IF objection = 'Have to rebuild entire ecosystem (schools, doctors, social)'",
    data_points_required: "Current location infrastructure, Township self-sufficiency data",
    persona_filter: "All relocating",
    objection_category: "Location & Ecosystem",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send self-sustaining township map: retail, F&B, schools, medical, social infrastructure within complex",
    escalation_trigger: "Specific requirement not available in township",
    fallback_action: "Show proximity to that requirement outside township",
    linked_talking_points: ["TP-LOC-002"],
  },
  "NBA-COL-011": {
    nba_id: "NBA-COL-011",
    trigger_condition: "IF objection = 'Price for this location is too low compared to premium areas'",
    data_points_required: "Premium area price comparison, Growth trajectory data, Infrastructure investment data",
    persona_filter: "Pragmatic Investor, Quality-conscious",
    objection_category: "Location & Ecosystem",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send price trend comparison: emerging vs established. Show Kolshet growth rate vs peaked locations",
    escalation_trigger: "Perception persists",
    fallback_action: "Focus on brand quality and appreciation potential",
    linked_talking_points: ["TP-LOC-003"],
  },
  "NBA-COL-012": {
    nba_id: "NBA-COL-012",
    trigger_condition: "IF objection = 'Competitor project delivered, I can see actual product'",
    data_points_required: "Competitor project, Immensa/Sunrise availability, Quality comparison points",
    persona_filter: "All",
    objection_category: "Competition",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Offer Immensa/Sunrise walkthrough (same developer, delivered). Send video tour + quality comparison",
    escalation_trigger: "Cannot schedule Immensa visit",
    fallback_action: "Send detailed video walkthrough + resident testimonials",
    linked_talking_points: ["TP-COMP-001"],
  },
  "NBA-COL-013": {
    nba_id: "NBA-COL-013",
    trigger_condition: "IF objection = 'Competitor has better delivery track record'",
    data_points_required: "Competitor delivery history, Kalpataru 55-year history, Delivered project references",
    persona_filter: "All",
    objection_category: "Competition",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send Kalpataru legacy document: 113+ projects, 55 years, safety record. Arrange delivered resident testimonials",
    escalation_trigger: "Specific past delay cited (Immensa)",
    fallback_action: "Address Immensa specifically with TP-POS-004",
    linked_talking_points: ["TP-COMP-002"],
  },
  "NBA-COL-014": {
    nba_id: "NBA-COL-014",
    trigger_condition: "IF objection = 'Competitor location perceived as more premium'",
    data_points_required: "Location comparison, Infrastructure growth data, Price appreciation comparison",
    persona_filter: "All",
    objection_category: "Competition",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Send infrastructure growth comparison: Metro, DP roads, commercial development. Show 'next premium' narrative",
    escalation_trigger: "Emotional attachment to other location",
    fallback_action: "Respect preference, stay in touch for future",
    linked_talking_points: ["TP-COMP-005"],
  },

  // Offer Actions
  "NBA-OFF-001": {
    nba_id: "NBA-OFF-001",
    trigger_condition: "IF objection = 'Budget Stretch' AND gap < 15% of budget",
    data_points_required: "Stated budget, Unit price, Gap amount, Enrichment: Actual affordability",
    persona_filter: "Aspirant Upgrader, Asset-Locked",
    objection_category: "Economic Fit",
    action_category: "OFFER",
    specific_action: "Suggest lower floor (same layout) to bridge gap OR alternative unit type",
    escalation_trigger: "No suitable alternative",
    fallback_action: "Discuss payment plan to reduce immediate outflow",
    linked_talking_points: ["TP-ECO-007"],
  },
  "NBA-OFF-002": {
    nba_id: "NBA-OFF-002",
    trigger_condition: "IF objection = 'Payment Schedule' AND request = 'Lower OCR'",
    data_points_required: "OCR capability, Loan eligibility, Enrichment: Income stability",
    persona_filter: "Asset-Locked, Aspirant Upgrader",
    objection_category: "Economic Fit",
    action_category: "OFFER",
    specific_action: "Propose structured payment plan OR bullet payment option post management approval",
    escalation_trigger: "OCR still too high",
    fallback_action: "Suggest smaller unit OR Primera redirect",
    linked_talking_points: ["TP-ECO-006", "TP-ECO-008"],
  },
  "NBA-OFF-003": {
    nba_id: "NBA-OFF-003",
    trigger_condition: "IF objection = 'SOP Required' AND days_to_close > 30",
    data_points_required: "Current property details, Expected sale value, Sale timeline",
    persona_filter: "Asset-Locked Upgrader",
    objection_category: "Economic Fit",
    action_category: "OFFER",
    specific_action: "Offer Conditional Booking: ₹1L refundable token, 60-day price lock",
    escalation_trigger: "60 days insufficient",
    fallback_action: "Offer extension (₹50K additional) OR introduce resale partner",
    linked_talking_points: ["TP-ECO-010"],
  },
  "NBA-OFF-004": {
    nba_id: "NBA-OFF-004",
    trigger_condition: "IF objection = 'EMI + Rent Double Burden' AND timeline_flexible",
    data_points_required: "Current rent, EMI calculation, UC vs RTMI comparison done",
    persona_filter: "All with rental situation",
    objection_category: "Possession Timeline",
    action_category: "OFFER",
    specific_action: "Pitch 20:80 plan with Pre-EMI vs Rent comparison calculation",
    escalation_trigger: "Pre-EMI still high",
    fallback_action: "Show total 3-year outflow comparison (rent vs Pre-EMI + asset)",
    linked_talking_points: ["TP-POS-001"],
  },
  "NBA-OFF-005": {
    nba_id: "NBA-OFF-005",
    trigger_condition: "IF interest_level = 'Hot' AND decision_pending = 'Price Negotiation'",
    data_points_required: "Interested unit, Best price given, Competition price reference",
    persona_filter: "All",
    objection_category: "Economic Fit",
    action_category: "OFFER",
    specific_action: "Create urgency with time-bound offer (valid 7 days) + unit scarcity message",
    escalation_trigger: "Offer rejected",
    fallback_action: "Final price with manager approval OR accept loss",
    linked_talking_points: ["TP-DEC-001"],
  },
  "NBA-OFF-006": {
    nba_id: "NBA-OFF-006",
    trigger_condition: "IF objection = 'Vastu Non-Compliance' AND vastu_units_available = True",
    data_points_required: "Specific vastu requirement, Vastu-compliant inventory",
    persona_filter: "Vastu-Rigid",
    objection_category: "Inventory & Product",
    action_category: "OFFER",
    specific_action: "Immediately show ONLY vastu-compliant units, highlight scarcity and premium",
    escalation_trigger: "No compliant units available",
    fallback_action: "Offer waitlist for next release OR customization discussion",
    linked_talking_points: ["TP-INV-004"],
  },
  "NBA-OFF-007": {
    nba_id: "NBA-OFF-007",
    trigger_condition: "IF requirement = 'Unit with deck' AND budget_stretch_for_deck = True",
    data_points_required: "Deck premium amount, Non-deck alternatives with larger carpet, Payment flexibility",
    persona_filter: "All",
    objection_category: "Inventory & Product",
    action_category: "OFFER",
    specific_action: "Break down deck cost separately. Offer aggressive payment OR show larger non-deck unit as alternative",
    escalation_trigger: "Deck is absolute must",
    fallback_action: "Focus on deck units only, adjust other preferences",
    linked_talking_points: ["TP-INV-002"],
  },
  "NBA-OFF-008": {
    nba_id: "NBA-OFF-008",
    trigger_condition: "IF status = 'Need to visit competition before deciding'",
    data_points_required: "Competitors to visit, Current offer validity, Unit availability status",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "OFFER",
    specific_action: "Create urgency: time-bound offer + unit scarcity message. Offer to set up competition comparison visits",
    escalation_trigger: "Insists on exploring without commitment",
    fallback_action: "Schedule follow-up post competition visits",
    linked_talking_points: ["TP-DEC-001"],
  },

  // Follow-up Actions
  "NBA-FUP-001": {
    nba_id: "NBA-FUP-001",
    trigger_condition: "IF site_visit_completed = True AND booking_not_done",
    data_points_required: "Visit date, Units shown, Objections, Interest level",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "FOLLOW-UP",
    specific_action: "Day 1: Thank you call + address any concerns. Day 3: Unit availability update. Day 7: Urgency message",
    escalation_trigger: "No progression after Day 7",
    fallback_action: "Reduce follow-up frequency, re-engage monthly",
    linked_talking_points: [],
  },
  "NBA-FUP-002": {
    nba_id: "NBA-FUP-002",
    trigger_condition: "IF conditional_booking = True AND SOP_in_progress",
    data_points_required: "Booking date, SOP timeline, Partner agency engagement",
    persona_filter: "Asset-Locked Upgrader",
    objection_category: "Economic Fit",
    action_category: "FOLLOW-UP",
    specific_action: "Weekly SOP progress check-in. Day 30: Mid-point review. Day 45: Extension discussion",
    escalation_trigger: "SOP dragging beyond 60 days",
    fallback_action: "Discuss extension OR release unit with re-engagement plan",
    linked_talking_points: ["TP-ECO-010"],
  },
  "NBA-FUP-003": {
    nba_id: "NBA-FUP-003",
    trigger_condition: "IF sample_flat_rating > 8 AND booking_not_done",
    data_points_required: "Visit date, Rating, Objections if any",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "FOLLOW-UP",
    specific_action: "High priority follow-up within 24 hours. Create urgency with competing interest",
    escalation_trigger: "Delay without clear reason",
    fallback_action: "Identify hidden objection through discovery call",
    linked_talking_points: [],
  },
  "NBA-FUP-004": {
    nba_id: "NBA-FUP-004",
    trigger_condition: "IF persona = 'Pragmatic Investor' AND no_decision_after_roi_discussion",
    data_points_required: "ROI discussed, Yield expectations, Competition consideration",
    persona_filter: "Pragmatic Investor",
    objection_category: "Investment",
    action_category: "FOLLOW-UP",
    specific_action: "Send market update email monthly with price appreciation data",
    escalation_trigger: "Unsubscribed/No interest",
    fallback_action: "Archive, re-engage only on major project milestone",
    linked_talking_points: ["TP-INV-006"],
  },
  "NBA-FUP-005": {
    nba_id: "NBA-FUP-005",
    trigger_condition: "IF lead_went_cold AND reason = 'Budget' AND enrichment_shows_capability",
    data_points_required: "Original budget stated, Enrichment: Actual financial capability, Time since cold",
    persona_filter: "All",
    objection_category: "Economic Fit",
    action_category: "FOLLOW-UP",
    specific_action: "Re-engage after 3 months with new payment plan or offer",
    escalation_trigger: "Still not affordable",
    fallback_action: "Move to Primera or long-term nurture",
    linked_talking_points: [],
  },

  // Escalation Actions
  "NBA-ESC-001": {
    nba_id: "NBA-ESC-001",
    trigger_condition: "IF days_since_site_visit > 7 AND no_response_to_calls > 3 AND interest_was_high",
    data_points_required: "Visit history, Objections raised, Units shown",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "ESCALATION",
    specific_action: "Escalate to Sales Manager for personal outreach call",
    escalation_trigger: "Still no response",
    fallback_action: "Mark as cold, re-engage after 30 days with new offer",
    linked_talking_points: [],
  },
  "NBA-ESC-002": {
    nba_id: "NBA-ESC-002",
    trigger_condition: "IF negotiation_deadlock = True AND deal_value > 2Cr",
    data_points_required: "Negotiation history, Price gap, Client seriousness indicators",
    persona_filter: "Lifestyle Connoisseur, Pragmatic Investor",
    objection_category: "Economic Fit",
    action_category: "ESCALATION",
    specific_action: "Escalate to Project Head for special approval consideration",
    escalation_trigger: "Approval not possible",
    fallback_action: "Best and final offer communication",
    linked_talking_points: [],
  },
  "NBA-ESC-003": {
    nba_id: "NBA-ESC-003",
    trigger_condition: "IF loan_rejection = True AND client_serious = True",
    data_points_required: "Rejection reason, Bank name, Alternative assessment",
    persona_filter: "Aspirant Upgrader, Asset-Locked",
    objection_category: "Economic Fit",
    action_category: "ESCALATION",
    specific_action: "Connect with Banking Partner team for NBFC/alternate bank options",
    escalation_trigger: "All options exhausted",
    fallback_action: "Suggest co-applicant OR smaller unit",
    linked_talking_points: ["TP-ECO-009"],
  },
  "NBA-ESC-004": {
    nba_id: "NBA-ESC-004",
    trigger_condition: "IF persona = 'Settlement Seeker' AND age > 75",
    data_points_required: "Age confirmed, Urgency level, Budget",
    persona_filter: "Settlement Seeker",
    objection_category: "Possession Timeline",
    action_category: "ESCALATION",
    specific_action: "IMMEDIATE transfer to Resale Desk - do NOT continue Eternia pitch",
    escalation_trigger: "N/A",
    fallback_action: "This is mandatory escalation - never pitch UC to 75+ immediate need",
    linked_talking_points: ["TP-SPEC-005"],
  },
  "NBA-ESC-005": {
    nba_id: "NBA-ESC-005",
    trigger_condition: "IF complaint_about_process = True OR dissatisfaction_expressed = True",
    data_points_required: "Nature of complaint, Interaction history",
    persona_filter: "All",
    objection_category: "Decision Process",
    action_category: "ESCALATION",
    specific_action: "Escalate to Team Lead for resolution and relationship recovery",
    escalation_trigger: "Continued dissatisfaction",
    fallback_action: "Escalate to VP Sales",
    linked_talking_points: [],
  },
  "NBA-ESC-006": {
    nba_id: "NBA-ESC-006",
    trigger_condition: "IF loan_rejected = True OR loan_eligibility < required_amount",
    data_points_required: "Rejection reason, Current eligibility, Co-applicant availability, NBFC options",
    persona_filter: "All loan-dependent",
    objection_category: "Economic Fit",
    action_category: "ESCALATION",
    specific_action: "Connect with banking partner for NBFC/alternate bank exploration. Discuss co-applicant addition benefit",
    escalation_trigger: "No loan option viable",
    fallback_action: "Suggest higher down payment OR smaller unit OR credit repair timeline",
    linked_talking_points: ["TP-ECO-009"],
  },
  "NBA-ESC-007": {
    nba_id: "NBA-ESC-007",
    trigger_condition: "IF beneficiary_age > 75 AND need = 'Immediate possession'",
    data_points_required: "Age confirmed, Budget, RTMI inventory in Immensa/Sunrise",
    persona_filter: "Settlement Seeker",
    objection_category: "Special Scenarios",
    action_category: "ESCALATION",
    specific_action: "MANDATORY: Immediately pivot to Resale Desk. Do NOT pitch Eternia UC. Show Immensa/Sunrise ready options",
    escalation_trigger: "N/A - This is mandatory",
    fallback_action: "NEVER pitch UC to 75+ immediate need. System block required.",
    linked_talking_points: ["TP-SPEC-005"],
  },

  // Special Scenario Actions
  "NBA-SPEC-001": {
    nba_id: "NBA-SPEC-001",
    trigger_condition: "IF current_residence CONTAINS 'Lodha Amara' OR 'Amara'",
    data_points_required: "Current unit size, Pain points with density, Budget for upgrade",
    persona_filter: "Amara Upgrader (Density Escaper)",
    objection_category: "Special Scenarios",
    action_category: "OFFER",
    specific_action: "Lead with 'density escape' narrative. Show GCP size vs Amara amenity crowding. Prioritize this lead",
    escalation_trigger: "Price objection",
    fallback_action: "Show cost per sqft of PEACE - lower density value proposition",
    linked_talking_points: ["TP-SPEC-001"],
  },
  "NBA-SPEC-002": {
    nba_id: "NBA-SPEC-002",
    trigger_condition: "IF existing_kalpataru_customer = True AND intent = 'Upgrade'",
    data_points_required: "Current unit, Current tower, Upgrade motivation, Budget increase capacity",
    persona_filter: "Existing Kalpataru Upgrader",
    objection_category: "Special Scenarios",
    action_category: "OFFER",
    specific_action: "Acknowledge loyalty. Offer preferential unit access. Discuss current unit sale support",
    escalation_trigger: "Current unit sale concern",
    fallback_action: "Connect with internal resale support",
    linked_talking_points: ["TP-SPEC-002"],
  },
  "NBA-SPEC-003": {
    nba_id: "NBA-SPEC-003",
    trigger_condition: "IF current_residence_type = 'Rental' AND location CONTAINS 'Immensa' OR 'Parkcity'",
    data_points_required: "Current rent, Rental duration, Reason for not buying earlier",
    persona_filter: "Immensa/Parkcity Rental Converter",
    objection_category: "Special Scenarios",
    action_category: "COMMUNICATION",
    specific_action: "Leverage existing experience. Show rent vs EMI math with their actual numbers",
    escalation_trigger: "Still hesitant",
    fallback_action: "Introduce to existing owners for testimonial",
    linked_talking_points: ["TP-SPEC-004"],
  },
  "NBA-SPEC-004": {
    nba_id: "NBA-SPEC-004",
    trigger_condition: "IF enrichment_data.cibil < 650 AND stated_intent = 'Loan'",
    data_points_required: "CIBIL score, Income verified, Budget stated",
    persona_filter: "All",
    objection_category: "Economic Fit",
    action_category: "ESCALATION",
    specific_action: "Flag loan risk early. Suggest higher down payment OR smaller unit OR credit repair advice",
    escalation_trigger: "CIBIL too low for any loan",
    fallback_action: "Suggest credit repair and re-engage in 6 months",
    linked_talking_points: [],
  },
  "NBA-SPEC-005": {
    nba_id: "NBA-SPEC-005",
    trigger_condition: "IF enrichment_data.income > 50LPA AND interested_unit_price < 2Cr",
    data_points_required: "Verified income, Unit interest, Family size",
    persona_filter: "Potential HNI Upgrader",
    objection_category: "Economic Fit",
    action_category: "OFFER",
    specific_action: "Upsell opportunity. Suggest premium units, Jodi options, GCP-facing inventory",
    escalation_trigger: "Client happy with smaller unit",
    fallback_action: "Respect choice but note for future upgrade",
    linked_talking_points: [],
  },
  "NBA-SPEC-006": {
    nba_id: "NBA-SPEC-006",
    trigger_condition: "IF school_proximity_mentioned = True AND kids_age BETWEEN 3 AND 12",
    data_points_required: "Kids ages, Current school, School preference",
    persona_filter: "Family with Young Kids",
    objection_category: "Location & Ecosystem",
    action_category: "CONTENT/COLLATERAL",
    specific_action: "Lead with school proximity pitch. Poddar 2km, Vasant Vihar 3km. Safe neighborhood narrative",
    escalation_trigger: "School preference is elsewhere",
    fallback_action: "Show commute time from Eternia to their preferred school",
    linked_talking_points: ["TP-LOC-001"],
  },
};

// ============= OBJECTION DETECTION KEYWORDS =============

export const OBJECTION_DETECTION_KEYWORDS: Record<ObjectionCategory, string[]> = {
  "Economic Fit": [
    "budget", "expensive", "costly", "price", "afford", "EMI", "loan", "payment",
    "cheaper", "competition price", "subvention", "OCR", "down payment",
    "sell property first", "CSOP", "stretch", "out of budget", "gap"
  ],
  "Possession Timeline": [
    "possession", "delay", "when ready", "move in", "immediate", "RTMI",
    "ready to move", "2027", "2028", "2029", "Immensa delayed", "construction slow",
    "timeline", "urgent", "parents", "senior", "elderly", "75+"
  ],
  "Inventory & Product": [
    "small", "compact", "room size", "bedroom", "kitchen", "cramped", "view",
    "facing", "building in front", "privacy", "vastu", "direction", "north",
    "east", "entrance", "floor", "ventilation", "light", "amenities", "deck", "balcony"
  ],
  "Location & Ecosystem": [
    "location", "far", "commute", "office", "work", "travel", "connectivity",
    "metro", "highway", "school", "hospital", "market", "infrastructure",
    "area", "vicinity", "congested"
  ],
  "Competition": [
    "Lodha", "Dosti", "Runwal", "Rustomjee", "Godrej", "Piramal", "Oberoi",
    "Raymond", "competition", "competitor", "Amara", "Crown", "West County",
    "cheaper there", "better deal", "delivered"
  ],
  "Investment": [
    "investment", "ROI", "rental", "yield", "appreciation", "returns",
    "rent out", "capital gain", "tax", "investor"
  ],
  "Decision Process": [
    "discuss", "family", "parents", "spouse", "wife", "husband", "children",
    "decision maker", "exploring", "just started", "not sure", "thinking",
    "bring", "visit again"
  ],
  "Special Scenarios": [
    "Amara", "existing customer", "Immensa rental", "NRI", "Hyderabad",
    "Pune", "Bangalore", "Gulf", "abroad", "first home", "young", "single"
  ],
};

// ============= PERSONA-OBJECTION MATRIX =============
// Maps persona + objection category to recommended NBA-ID and TP-IDs

export const PERSONA_OBJECTION_MATRIX: Record<string, Record<string, MatrixEntry>> = {
  "Lifestyle Connoisseur": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-003"], action_summary: "Suggest premium with value" },
    "Budget Gap (>15%)": { nba_id: "NBA-ESC-002", tp_ids: ["TP-ECO-003"], action_summary: "Manager involvement" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Premium conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "NBFC + co-applicant" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Construction progress" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Address directly" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Sample flat + Jodi option" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Show compliant options" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "GCP premium justification" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Quality comparison" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Infrastructure growth" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Senior connect" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002"], action_summary: "Educate + nurture" },
  },
  "Aspirant Upgrader": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Lower floor/unit" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Redirect to Primera" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Standard conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Critical - NBFC options" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-001"], action_summary: "Progress + 20:80 risk mitigation" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Show current progress" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Efficiency comparison" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Limited compliant inventory" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "Building gap explanation" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Quality + payment comparison" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Future appreciation" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-002"], action_summary: "Family visit scheduling" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002"], action_summary: "Size + budget guidance" },
  },
  "Asset-Locked Upgrader": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional + SOP" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "60-day lock + partner" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "SOP + loan combo" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Progress report" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Progress + 20:80" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Sample flat visit" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Compliant inventory" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "View options in budget" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Total cost comparison" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Growth potential" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "SOP + family timeline" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002"], action_summary: "SOP timing discussion" },
  },
  "Vastu-Rigid Buyer": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Vastu premium may justify" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Limited vastu inventory" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Often cash-rich, verify" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Progress report" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Progress report" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Vastu-compliant + sample" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "CRITICAL - Only compliant" },
    "View/Privacy Concern": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-003"], action_summary: "Vastu + view combo" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Quality matters for vastu" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Location + vastu" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Elder consultation" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-INV-004"], action_summary: "Vastu early qualification" },
  },
  "Settlement Seeker": {
    "Budget Gap (<15%)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Budget Gap (>15%)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "SOP Required": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Usually cash buyers" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "CRITICAL - Resale ONLY" },
    "Timeline Concern (General)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "May need RTMI" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Pivot to RTMI" },
    "Rooms Feel Small": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Vastu Non-Compliance": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "View/Privacy Concern": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Price Lower at Competitor": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Competitor Location Better": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Multiple Decision Makers": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
    "Just Started Exploring": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Redirect to RTMI" },
  },
  "Pragmatic Investor": {
    "Budget Gap (<15%)": { nba_id: "NBA-COL-006", tp_ids: ["TP-INV-006"], action_summary: "ROI justifies premium" },
    "Budget Gap (>15%)": { nba_id: "NBA-COL-006", tp_ids: ["TP-INV-006"], action_summary: "Multiple unit option" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Investment timing" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Multiple property pledge" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-COL-006", tp_ids: ["TP-INV-006"], action_summary: "Investors OK with timeline" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Construction-linked payment" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Risk mitigation focus" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Rental-focused sizing" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Less important for investors" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "Rental view premium" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Investment quality" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "ROI comparison" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Data for discussion" },
    "Just Started Exploring": { nba_id: "NBA-FUP-004", tp_ids: ["TP-INV-006"], action_summary: "Market education" },
  },
  "Business Owner": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007", "TP-ECO-003"], action_summary: "Floor adjustment + value proposition" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-002", tp_ids: ["TP-ECO-006", "TP-ECO-008"], action_summary: "Payment restructuring for cash flow" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional with business flexibility" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Often cash-rich, explore alternatives" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003", "TP-POS-001"], action_summary: "Progress + opportunity cost" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Track record reassurance" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Efficiency + Jodi option" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Show compliant premium options" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "GCP premium justification" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003", "TP-ECO-003"], action_summary: "Quality + lifestyle differentiation" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Growth potential + infrastructure" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Quick senior connect" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002", "TP-ECO-003"], action_summary: "Time-efficient education" },
  },
  "Amara Density Escaper": {
    "Budget Gap (<15%)": { nba_id: "NBA-SPEC-001", tp_ids: ["TP-SPEC-001"], action_summary: "Density value justifies" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Smaller efficient unit" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "NBFC options" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-COMP-002"], action_summary: "vs Amara delivery" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Differentiate from Amara delays" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-SPEC-001"], action_summary: "vs Amara cramped" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Show compliant options" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-SPEC-001"], action_summary: "vs Amara tower gaps" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-SPEC-001"], action_summary: "They know Amara quality" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-001"], action_summary: "Same location as current" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Bring family from Amara" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-SPEC-001"], action_summary: "Leverage Amara experience" },
  },
  "Kalpataru Loyalist Upgrader": {
    "Budget Gap (<15%)": { nba_id: "NBA-SPEC-002", tp_ids: ["TP-SPEC-002"], action_summary: "Loyalty benefits" },
    "Budget Gap (>15%)": { nba_id: "NBA-SPEC-002", tp_ids: ["TP-SPEC-002"], action_summary: "Explore smaller upgrade" },
    "SOP Required": { nba_id: "NBA-SPEC-002", tp_ids: ["TP-SPEC-002"], action_summary: "Internal resale support" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Existing loan transfer" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Show Immensa delivery" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Show Immensa now delivered" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Show upgrade options" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Compliant upgrade path" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "View upgrade path" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-002"], action_summary: "Brand comparison" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-002"], action_summary: "Township benefits" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Existing experience" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-SPEC-002"], action_summary: "Upgrade path education" },
  },
  "Parkcity Rental Converter": {
    "Budget Gap (<15%)": { nba_id: "NBA-SPEC-003", tp_ids: ["TP-SPEC-004"], action_summary: "Own vs rent math" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Redirect to Primera consideration" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "NBFC options" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Familiar with township" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "They see construction daily" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Compare with current rental" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Compliant options" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "Similar to current" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-SPEC-004"], action_summary: "They know KL quality" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-001"], action_summary: "They know location" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Family walkthrough" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-SPEC-004"], action_summary: "Own vs rent education" },
  },
  "NRI/Out-of-City Relocator": {
    "Budget Gap (<15%)": { nba_id: "NBA-COM-005", tp_ids: ["TP-SPEC-003"], action_summary: "Virtual walkthrough" },
    "Budget Gap (>15%)": { nba_id: "NBA-COM-005", tp_ids: ["TP-SPEC-003"], action_summary: "Realistic budget discussion" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Extended timeline" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "NRI banking channels" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Video progress updates" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Third-party verification" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Virtual sample walkthrough" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Remote vastu verification" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "View photos/videos" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Send comparison PDF" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-001"], action_summary: "Metro connectivity" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-005", tp_ids: ["TP-DEC-003"], action_summary: "VC with family" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-SPEC-003"], action_summary: "Virtual education series" },
  },
  "First-Time Investor": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Entry unit" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Redirect to Primera" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Critical for segment" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-001"], action_summary: "20:80 reduces risk" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "20:80 protects you" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Entry 2BHK efficient" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Compliant entry units" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "Budget view options" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Long-term value" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-001"], action_summary: "Work commute focus" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-002"], action_summary: "Parents visit" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002"], action_summary: "First-timer guidance" },
  },
  "Senior Citizen Self-Use": {
    "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-003"], action_summary: "Value focus" },
    "Budget Gap (>15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007"], action_summary: "Right-size unit" },
    "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional booking" },
    "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Often pension-backed" },
    "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Resale priority" },
    "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Progress + lower floor earlier" },
    "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003"], action_summary: "Sooner towers option" },
    "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Practical sizing" },
    "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Often important segment" },
    "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "Ground floor garden" },
    "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003"], action_summary: "Quality for seniors" },
    "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-002"], action_summary: "Medical proximity" },
    "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Children/spouse visit" },
    "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002"], action_summary: "Retirement planning" },
  },
};

// ============= HELPER FUNCTIONS =============

/**
 * Detect objection categories from CRM comments and extracted signals
 */
export function detectObjectionCategories(
  visitComments: string,
  extractedSignals: any
): ObjectionCategory[] {
  const detectedCategories: ObjectionCategory[] = [];
  const lowerComments = (visitComments || "").toLowerCase();

  for (const [category, keywords] of Object.entries(OBJECTION_DETECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerComments.includes(keyword.toLowerCase())) {
        if (!detectedCategories.includes(category as ObjectionCategory)) {
          detectedCategories.push(category as ObjectionCategory);
        }
        break;
      }
    }
  }

  // Also check extracted concerns
  if (extractedSignals?.concerns_extracted) {
    for (const concern of extractedSignals.concerns_extracted) {
      const topic = concern.topic;
      if (topic === "Price" && !detectedCategories.includes("Economic Fit")) {
        detectedCategories.push("Economic Fit");
      } else if (topic === "Possession" && !detectedCategories.includes("Possession Timeline")) {
        detectedCategories.push("Possession Timeline");
      } else if (topic === "Location" && !detectedCategories.includes("Location & Ecosystem")) {
        detectedCategories.push("Location & Ecosystem");
      } else if (topic === "Config" && !detectedCategories.includes("Inventory & Product")) {
        detectedCategories.push("Inventory & Product");
      }
    }
  }

  return detectedCategories;
}

/**
 * Map persona to a normalized persona ID for matrix lookup
 */
export function normalizePersona(persona: string): string {
  const personaLower = (persona || "").toLowerCase();

  if (personaLower.includes("lifestyle") || personaLower.includes("connoisseur")) {
    return "Lifestyle Connoisseur";
  }
  if (personaLower.includes("aspirant") || personaLower.includes("first-time buyer")) {
    return "Aspirant Upgrader";
  }
  if (personaLower.includes("asset") || personaLower.includes("locked")) {
    return "Asset-Locked Upgrader";
  }
  if (personaLower.includes("vastu")) {
    return "Vastu-Rigid Buyer";
  }
  if (personaLower.includes("settlement") || personaLower.includes("retirement planner")) {
    return "Settlement Seeker";
  }
  if (personaLower.includes("investor") && personaLower.includes("pragmatic")) {
    return "Pragmatic Investor";
  }
  if (personaLower.includes("business") && personaLower.includes("owner")) {
    return "Business Owner";
  }
  if (personaLower.includes("amara") || personaLower.includes("density")) {
    return "Amara Density Escaper";
  }
  if (personaLower.includes("loyalist") || personaLower.includes("kalpataru")) {
    return "Kalpataru Loyalist Upgrader";
  }
  if (personaLower.includes("parkcity") || personaLower.includes("rental converter")) {
    return "Parkcity Rental Converter";
  }
  if (personaLower.includes("nri") || personaLower.includes("out-of-city") || personaLower.includes("relocator")) {
    return "NRI/Out-of-City Relocator";
  }
  if (personaLower.includes("first-time") && personaLower.includes("investor")) {
    return "First-Time Investor";
  }
  if (personaLower.includes("senior") || personaLower.includes("retired")) {
    return "Senior Citizen Self-Use";
  }

  // Default fallback
  return "Aspirant Upgrader";
}

/**
 * Helper function for keyword matching
 */
function containsAny(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Map objection category to specific sub-category for matrix lookup
 * Enhanced with keyword detection from visitComments for 14 granular sub-categories
 */
export function mapToMatrixObjection(
  objectionCategory: ObjectionCategory,
  extractedSignals: any,
  visitComments: string = ""
): string {
  const lowerComments = (visitComments || "").toLowerCase();
  const lowerNonBooking = (extractedSignals?.engagement_signals?.non_booking_reason || "").toLowerCase();
  const combinedText = `${lowerComments} ${lowerNonBooking}`;
  
  const budgetGap = extractedSignals?.financial_signals?.budget_gap_percent;
  const age = extractedSignals?.demographics?.age;

  switch (objectionCategory) {
    case "Economic Fit":
      // Check SOP/selling current property first (highest priority)
      if (containsAny(combinedText, ["sell property", "sell flat", "sop", "current flat sale", "selling", "need to sell", "sale of current"])) {
        return "SOP Required";
      }
      // Check loan/eligibility issues
      if (containsAny(combinedText, ["loan", "eligibility", "bank reject", "rejected", "cibil", "loan issue", "financing", "bank approval"])) {
        return "Loan Eligibility Issue";
      }
      // Budget gap based detection
      if (budgetGap !== null && budgetGap !== undefined) {
        return budgetGap > 15 ? "Budget Gap (>15%)" : "Budget Gap (<15%)";
      }
      return "Budget Gap (<15%)"; // Default for Economic Fit

    case "Possession Timeline":
      // RTMI need for 75+ age (highest priority)
      if (age && age > 75) {
        return "RTMI Need (Urgent 75+)";
      }
      // Check for Immensa delay fear
      if (containsAny(lowerComments, ["immensa", "delay history", "previous delay", "delayed before", "late possession"])) {
        return "Delay Fear (Immensa History)";
      }
      // Check for general timeline/possession concerns
      if (containsAny(lowerComments, ["possession", "timeline", "2027", "2028", "2029", "when ready", "completion"])) {
        return "Timeline Concern (General)";
      }
      return "Timeline Concern (General)"; // Default for Possession Timeline

    case "Inventory & Product":
      // Check Vastu concerns (highest priority in this category)
      if (containsAny(lowerComments, ["vastu", "direction", "northeast", "north east", "facing north", "facing east", "sun direction", "kitchen direction"])) {
        return "Vastu Non-Compliance";
      }
      // Check View/Privacy concerns
      if (containsAny(lowerComments, ["view", "privacy", "building in front", "facing building", "overlooking", "no view", "blocked view", "neighbour", "neighbor"])) {
        return "View/Privacy Concern";
      }
      // Check for deck/balcony requirements
      if (containsAny(lowerComments, ["deck", "balcony", "outdoor", "terrace", "jodi"])) {
        return "Deck/Jodi Requirement";
      }
      // Check room size concerns
      if (containsAny(lowerComments, ["small", "compact", "cramped", "room size", "bedroom small", "tiny", "space", "bigger rooms"])) {
        return "Rooms Feel Small";
      }
      return "Rooms Feel Small"; // Default for Inventory & Product

    case "Location & Ecosystem":
      // Check for specific competitor location mentions
      if (containsAny(lowerComments, ["hiranandani", "powai", "bkc", "worli", "premium area", "better location", "central location", "south bombay"])) {
        return "Competitor Location Better";
      }
      // Check for connectivity concerns
      if (containsAny(lowerComments, ["far", "commute", "travel time", "distance", "connectivity", "office far"])) {
        return "Connectivity Concerns";
      }
      return "Competitor Location Better"; // Default for Location

    case "Competition":
      // Check for price comparison
      if (containsAny(lowerComments, ["cheaper", "lower price", "less expensive", "better price", "price difference", "more affordable"])) {
        return "Price Lower at Competitor";
      }
      // Check for specific competitor mentions
      if (containsAny(lowerComments, ["lodha", "dosti", "runwal", "oberoi", "godrej", "piramal", "rustomjee", "birla", "mahindra", "hiranandani"])) {
        return "Price Lower at Competitor";
      }
      return "Price Lower at Competitor"; // Default for Competition

    case "Investment":
      // Investment concerns - typically exploring options
      if (containsAny(lowerComments, ["roi", "rental", "yield", "appreciation", "investment", "return", "rental income"])) {
        return "Just Started Exploring";
      }
      return "Just Started Exploring"; // Default for Investment

    case "Decision Process":
      // Check for exploration phase
      if (containsAny(lowerComments, ["exploring", "just started", "first visit", "not sure", "options", "early stage", "looking around"])) {
        return "Just Started Exploring";
      }
      // Check for multiple decision makers
      if (containsAny(lowerComments, ["family", "parents", "spouse", "wife", "husband", "discuss", "bring", "decision maker", "son", "daughter", "consult"])) {
        return "Multiple Decision Makers";
      }
      return "Multiple Decision Makers"; // Default for Decision Process

    case "Special Scenarios":
      // NRI-specific handling
      if (containsAny(lowerComments, ["nri", "overseas", "abroad", "foreign", "dollar", "usd", "gulf", "usa", "uk", "singapore"])) {
        return "NRI Specific";
      }
      return "Just Started Exploring"; // Default fallback

    default:
      return "Just Started Exploring";
  }
}

/**
 * Look up matrix entry for persona + objection combination
 */
export function lookupMatrixEntry(
  persona: string,
  objectionCategory: ObjectionCategory,
  extractedSignals: any,
  visitComments: string = ""
): MatrixEntry | null {
  const normalizedPersona = normalizePersona(persona);
  const matrixObjection = mapToMatrixObjection(objectionCategory, extractedSignals, visitComments);

  const personaMatrix = PERSONA_OBJECTION_MATRIX[normalizedPersona];
  if (!personaMatrix) return null;

  return personaMatrix[matrixObjection] || null;
}

/**
 * Get talking point definition by ID
 */
export function getTalkingPointDef(tpId: string): TalkingPointDef | null {
  return TALKING_POINTS[tpId] || null;
}

/**
 * Get NBA rule definition by ID
 */
export function getNBARuleDef(nbaId: string): NBARule | null {
  return NBA_RULES[nbaId] || null;
}

/**
 * Check for mandatory safety conditions (75+ RTMI, etc.)
 */
export function checkSafetyConditions(
  persona: string,
  extractedSignals: any
): { triggered: boolean; safetyRule: string | null; overrideNbaId: string | null } {
  const normalizedPersona = normalizePersona(persona);
  const age = extractedSignals?.demographics?.age;
  const possessionUrgency = (extractedSignals?.engagement_signals?.possession_urgency || "").toLowerCase();
  const timelineConcern = possessionUrgency.includes("immediate") || possessionUrgency.includes("rtmi") || possessionUrgency.includes("urgent");

  // Rule 1: 75+ with immediate need
  if (age && age > 75 && (timelineConcern || normalizedPersona === "Settlement Seeker")) {
    return {
      triggered: true,
      safetyRule: "75+ RTMI mandatory - Never pitch UC to 75+ immediate need",
      overrideNbaId: "NBA-ESC-004",
    };
  }

  // Rule 2: Settlement Seeker always gets RTMI redirect
  if (normalizedPersona === "Settlement Seeker") {
    return {
      triggered: true,
      safetyRule: "Settlement Seeker - Redirect to RTMI/Resale",
      overrideNbaId: "NBA-ESC-004",
    };
  }

  return { triggered: false, safetyRule: null, overrideNbaId: null };
}

/**
 * Build relevant subset of framework for prompt (token optimization)
 */
export function buildFrameworkSubset(
  persona: string,
  objectionCategories: ObjectionCategory[]
): { talkingPoints: TalkingPointDef[]; nbaRules: NBARule[] } {
  const normalizedPersona = normalizePersona(persona);
  const relevantTPs: Set<string> = new Set();
  const relevantNBAs: Set<string> = new Set();

  // Get matrix entries for persona + each objection
  for (const objection of objectionCategories) {
    const personaMatrix = PERSONA_OBJECTION_MATRIX[normalizedPersona];
    if (personaMatrix) {
      for (const [, entry] of Object.entries(personaMatrix)) {
        relevantNBAs.add(entry.nba_id);
        for (const tpId of entry.tp_ids) {
          relevantTPs.add(tpId);
        }
      }
    }
  }

  // Also add TPs linked from NBA rules
  for (const nbaId of relevantNBAs) {
    const rule = NBA_RULES[nbaId];
    if (rule?.linked_talking_points) {
      for (const tpId of rule.linked_talking_points) {
        relevantTPs.add(tpId);
      }
    }
  }

  return {
    talkingPoints: Array.from(relevantTPs).map((id) => TALKING_POINTS[id]).filter(Boolean),
    nbaRules: Array.from(relevantNBAs).map((id) => NBA_RULES[id]).filter(Boolean),
  };
}

// ============= STAGE 3 PROMPT BUILDER =============

/**
 * Build Stage 3 prompt for NBA & Talking Points generation
 * Uses decision tree framework based on persona + objection matrix
 */
export function buildStage3Prompt(
  stage2Result: any,
  extractedSignals: any,
  visitComments: string
): string {
  const persona = stage2Result?.persona || "Unknown";
  const primaryConcern = stage2Result?.primary_concern_category || null;
  const concernCategories = stage2Result?.concern_categories || [];
  
  // Detect objection categories from visit comments and signals
  const objectionCategories = detectObjectionCategories(visitComments, extractedSignals);
  
  // Build relevant framework subset for this persona
  const frameworkSubset = buildFrameworkSubset(persona, objectionCategories);
  
  // Check safety conditions
  const safetyCheck = checkSafetyConditions(persona, extractedSignals);
  
  // Get normalized persona for matrix lookup
  const normalizedPersona = normalizePersona(persona);
  
  // Build persona-specific matrix excerpt
  const personaMatrix = PERSONA_OBJECTION_MATRIX[normalizedPersona] || {};
  
  // Build talking points reference section
  const tpReference = frameworkSubset.talkingPoints.map(tp => `
**${tp.tp_id}** (${tp.category} - ${tp.sub_category})
- Scenario: ${tp.objection_scenario}
- Talking Point: ${tp.talking_point}
- Key Data: ${tp.key_data_points}
- Emotional Hook: ${tp.emotional_hook}
- Logical Argument: ${tp.logical_argument}
${tp.competitor_counter ? `- Competitor Counter: ${tp.competitor_counter}` : ""}`
  ).join("\n");
  
  // Build NBA rules reference section
  const nbaReference = frameworkSubset.nbaRules.map(nba => `
**${nba.nba_id}** (${nba.action_category})
- Trigger: ${nba.trigger_condition}
- Action: ${nba.specific_action}
- Escalation Trigger: ${nba.escalation_trigger}
- Fallback: ${nba.fallback_action}
- Linked TPs: ${nba.linked_talking_points.join(", ")}`
  ).join("\n");
  
  // Build matrix excerpt for this persona
  const matrixExcerpt = Object.entries(personaMatrix).map(([objection, entry]) => 
    `| ${objection} | ${entry.nba_id} | ${entry.tp_ids.join(", ")} | ${entry.action_summary} |`
  ).join("\n");
  
  // Extract key context from signals
  const budgetStated = extractedSignals?.financial_signals?.budget_stated_cr || null;
  const budgetGap = extractedSignals?.financial_signals?.budget_gap_percent || null;
  const carpetDesired = extractedSignals?.property_preferences?.carpet_area_desired || null;
  const unitInterested = extractedSignals?.property_preferences?.specific_unit_interest || null;
  const competitors = extractedSignals?.competitor_intelligence?.competitors_mentioned || [];
  const age = extractedSignals?.demographics?.age || null;
  const visitNotesSummary = extractedSignals?.visit_notes_summary || "";
  
  const systemPrompt = `You are an expert real estate sales strategist. Your task is to generate the OPTIMAL Next Best Action (NBA) and Talking Points for a lead using a decision tree framework.

You MUST:
1. Use the Persona-Objection Matrix to select specific NBA-IDs and TP-IDs
2. Contextualize the framework talking points with lead-specific data
3. Keep the core message intact while adding specific numbers and context
4. Follow safety rules strictly (75+ RTMI mandatory, etc.)`;

  const inputDataSection = `# INPUT DATA (From Stage 1 & Stage 2)

## Lead Context
- Detected Persona: ${persona} (normalized: ${normalizedPersona})
- Primary Concern Category: ${primaryConcern || "None detected"}
- Secondary Concerns: ${concernCategories.join(", ") || "None"}
- Objection Categories Detected: ${objectionCategories.join(", ") || "None detected"}

## Customer Details
- Age: ${age || "Unknown"}
- Budget Stated: ${budgetStated ? `₹${budgetStated} Cr` : "Not stated"}
- Budget Gap: ${budgetGap !== null ? `${budgetGap.toFixed(1)}%` : "Not calculated"}
- Carpet Desired: ${carpetDesired || "Not specified"}
- Unit Interested: ${unitInterested ? unitInterested.join(", ") : "Not specified"}

## Competitors Mentioned
${competitors.length > 0 
  ? competitors.map((c: any) => `- ${c.name}: ${c.carpet_stated || "N/A"} sqft at ₹${c.price_stated_cr || "N/A"} Cr (${c.advantage_stated || "No advantage stated"})`).join("\n")
  : "None mentioned"}

## Visit Notes Summary
${visitNotesSummary}`;

  const safetySection = safetyCheck.triggered 
    ? `# ⚠️ SAFETY RULE TRIGGERED
**${safetyCheck.safetyRule}**
MANDATORY: Use NBA-ID ${safetyCheck.overrideNbaId} and corresponding talking points.
DO NOT recommend any Under Construction pitch.`
    : "";

  const frameworkSection = `# DECISION TREE FRAMEWORK

## Persona-Objection Matrix for "${normalizedPersona}"
| Objection | NBA-ID | TP-IDs | Action Summary |
|-----------|--------|--------|----------------|
${matrixExcerpt}

## Relevant Talking Points
${tpReference}

## Relevant NBA Rules
${nbaReference}`;

  const instructionsSection = `# GENERATION INSTRUCTIONS

## Step 1: Objection Classification
Based on the visit notes and extracted signals, classify the primary objection:
- Use the objection categories detected: ${objectionCategories.join(", ") || "None"}
- Map to the closest matrix row for "${normalizedPersona}"

## Step 2: Matrix Lookup
Use the Persona (${normalizedPersona}) + Primary Objection to find:
- NBA-ID from the matrix
- Linked TP-IDs

## Step 3: Talking Point Selection & Contextualization
For each TP-ID from the matrix:
1. Retrieve the framework talking point text
2. CONTEXTUALIZE with lead-specific data:
   - Include specific budget: ${budgetStated ? `₹${budgetStated} Cr` : "customer's budget"}
   - Include carpet area: ${carpetDesired || "their requirement"}
   - Reference competitors: ${competitors.map((c: any) => c.name).join(", ") || "as mentioned"}
   - Use visit notes context for personalization
3. KEEP the emotional hook and logical argument structure
4. Maximum 20 words per talking point
5. Store both the TP-ID and source_text (original framework text)

## Step 4: NBA Action Generation
From the selected NBA-ID:
1. Generate a specific, actionable statement
2. Include lead context: unit interested, timeline, budget gap
3. Maximum 15 words
4. Specify action_type: COMMUNICATION | CONTENT/COLLATERAL | OFFER | FOLLOW-UP | ESCALATION

## CRITICAL RULES
1. You MUST select from the provided TP-IDs and NBA-IDs - do NOT invent new ones
2. Contextualize but do NOT completely rewrite the talking point
3. If safety rule is triggered, use the override NBA-ID
4. Generate 2-3 talking points total (prioritize by type: Competitor > Objection > Highlight)`;

  const outputStructure = `# OUTPUT STRUCTURE
Return a JSON object with this EXACT structure:
{
  "objection_categories_detected": ["Economic Fit", "Competition"],
  "primary_objection": "Budget Gap (<15%)",
  "secondary_objections": ["Price Lower at Competitor"],
  
  "next_best_action": {
    "nba_id": "NBA-OFF-001",
    "action_type": "OFFER",
    "action": "Specific action max 15 words with lead context",
    "escalation_trigger": "When to escalate",
    "fallback_action": "Alternative if primary fails"
  },
  
  "talking_points": [
    {
      "tp_id": "TP-ECO-007",
      "type": "Objection handling",
      "point": "Contextualized point max 20 words with specific numbers",
      "source_text": "Original framework talking point text"
    },
    {
      "tp_id": "TP-COMP-003",
      "type": "Competitor handling",
      "point": "Contextualized competitor comparison with specific data",
      "source_text": "Original framework talking point text"
    }
  ],
  
  "safety_check_triggered": ${safetyCheck.triggered ? `"${safetyCheck.safetyRule}"` : "null"}
}`;

  return `${systemPrompt}

${inputDataSection}

${safetySection}

${frameworkSection}

${instructionsSection}

${outputStructure}`;
}
