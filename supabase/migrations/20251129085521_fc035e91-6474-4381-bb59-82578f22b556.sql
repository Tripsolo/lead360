-- Create brands table
CREATE TABLE public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  excel_schema JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id TEXT PRIMARY KEY,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Allow public read access to brands"
ON public.brands FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to projects"
ON public.projects FOR SELECT
USING (true);

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed brand data
INSERT INTO public.brands (id, name, metadata, excel_schema) VALUES (
  'kalpataru',
  'Kalpataru',
  '{
    "developer": {
      "name": "Kalpataru Limited",
      "legacy": "55+ years in real estate",
      "reputation": "Grade A developer, known for construction quality and timely delivery",
      "trust_signals": ["Legacy brand", "Roots experience center", "Transparent construction"]
    }
  }',
  '{
    "requiredColumns": ["Opportunity Name", "Mobile", "Walkin Date", "Name of Closing Manager"],
    "optionalColumns": ["Duplicate check", "Segment", "Project", "Occupation", "Designation", "Profession", "Other Profession", "Department / Function", "Other Department / Function", "Industry / Sector", "Other Industry / Sector", "Nature of Business", "Place of Work (Company Name)", "Office PIN Code", "Location of Work", "Location of Residence", "Building Name", "Correspondence Street 1", "Correspondence Country", "Correspondence State", "Correspondence City", "Other City", "Correspondence Pin Code", "Nearest Railway/Metro Station", "Desired Floor Band", "Desired Facing", "Desired Carpet Area (Post-Walkin)", "Stage of Construction (Post-Walkin)", "Searching Property since (in months)", "Expected Date of Closure", "Source of Funding", "Competitor Name 1", "Competition Project Name 1", "Competition Visit Status 1", "Competitor Name 2", "Competition Project Name 2", "Competition Visit Status 2", "Interested Unit 1", "Interested Unit 2", "Owned/Stay in Kalpataru Property", "Existing Flat Details", "Cooling Date", "Converted", "Opportunity Converted by Revisit", "Opportunity ID", "Latest Revisit Date", "No. of Site Re-Visits", "Interested Tower 1", "Interested Floor 1", "Interested Unit 1", "Interested Unit 2", "Walkin Auto Rating", "Walkin Manual Rating", "Reason for Lead Lost", "Reason for Opportunity Lost", "Last Follow Up Comments", "Site Re-Visit Comment", "Visit Comments (Not for Reports)"],
    "columnMappings": {
      "Opportunity Name": "name",
      "Mobile": "phone",
      "Walkin Date": "date",
      "Name of Closing Manager": "leadOwner",
      "Opportunity ID": "id",
      "Walkin Manual Rating": "managerRating",
      "Walkin Auto Rating": "rating",
      "Desired Floor Band": "floorPreference",
      "Desired Facing": "facing",
      "Desired Carpet Area (Post-Walkin)": "carpetArea",
      "Stage of Construction (Post-Walkin)": "constructionStage",
      "Expected Date of Closure": "timeline",
      "Source of Funding": "fundingSource",
      "Interested Tower 1": "towerInterested",
      "Interested Unit 1": "unitInterested",
      "Occupation": "occupation",
      "Designation": "designation",
      "Place of Work (Company Name)": "company",
      "Location of Residence": "currentResidence",
      "Location of Work": "workLocation",
      "Nearest Railway/Metro Station": "preferredStation",
      "Project": "projectInterest",
      "Last Follow Up Comments": "notes"
    }
  }'
);

-- Seed project data (Eternia with full metadata)
INSERT INTO public.projects (id, brand_id, name, metadata) VALUES (
  'eternia_parkcity_thane',
  'kalpataru',
  'Kalpataru Parkcity Eternia',
  '{
    "project_name": "Kalpataru Parkcity Eternia",
    "location": {
      "address": "Kolshet Road, Downtown Thane",
      "micro_market": "Kolshet Road Corridor",
      "positioning": "Premium Downtown Thane - transformation from industrial to residential belt",
      "walk_to_work_employers": ["TCS (3.7 km)", "Deloitte", "Accenture", "Wagle Industrial Estate (7.3 km)"],
      "medical_hub": ["Jupiter Hospital (3.3 km)", "Hiranandani Hospital (3.5 km)", "Bethany Hospital"]
    },
    "township": {
      "name": "Kalpataru Parkcity",
      "total_area_acres": 100,
      "grand_central_park": {
        "area_acres": 20.5,
        "lake_zone_acres": 3,
        "trees": 4500,
        "themed_gardens": ["Mughal Garden", "Japanese Garden", "Moroccan Garden"],
        "significance": "Extension of living room, micro-climate, better air quality"
      },
      "open_space_percent": 70,
      "podium_acres": 3.7,
      "podium_comparison": "Size of Gateway of India precinct",
      "vehicle_free_podium": true
    },
    "design_partners": {
      "master_planner": "Aedas (Singapore)",
      "architect": "HB Design (Singapore)",
      "landscape": "One Landscape (Hong Kong)",
      "significance": "International design standards, appeals to NRI and corporate segment"
    },
    "inventory": {
      "configurations": [
        {
          "type": "1 BHK / Compact 2 BHK",
          "carpet_sqft_range": [450, 531],
          "price_range_cr": [0.85, 1.15],
          "target_persona": "Investor",
          "notes": "Excellent for rental yield, often rejected by end-users as too small"
        },
        {
          "type": "2 BHK Standard",
          "carpet_sqft_range": [695, 695],
          "price_range_cr": [1.45, 1.65],
          "target_persona": "Upgrade Seeker",
          "notes": "Volume driver, sweet spot for upgraders. Kitchen size is recurring friction point"
        },
        {
          "type": "2 BHK Large",
          "carpet_sqft_range": [796, 796],
          "price_range_cr": [1.70, 1.95],
          "target_persona": "Upgrade Seeker / Business Owner",
          "notes": "No compromise 2BHK. For those who can afford 3BHK but prefer spacious 2BHK lifestyle"
        },
        {
          "type": "3 BHK Standard",
          "carpet_sqft_range": [900, 950],
          "price_range_cr": [2.20, 2.50],
          "target_persona": "First-Time Buyer / Upgrade Seeker",
          "notes": "Often criticized for cramped bedrooms at lower end"
        },
        {
          "type": "3 BHK Large",
          "carpet_sqft_range": [1100, 1409],
          "price_range_cr": [2.80, 3.50],
          "target_persona": "Business Owner / NRI Buyer",
          "notes": "Highly desired. Master suite feel. Balcony presence is major converter"
        },
        {
          "type": "4 BHK / Duplex",
          "carpet_sqft_range": [1700, 1800],
          "price_range_cr": [3.80, 4.50],
          "target_persona": "Business Owner",
          "notes": "Trophy asset. Buyers compare against bungalows and ultra-luxury projects"
        }
      ],
      "view_premium": {
        "gcp_view": "Premium pricing, highly desired",
        "podium_view": "Standard pricing",
        "city_view": "Can be used for price negotiation"
      },
      "floor_rise_notes": "Higher floors command premium. Moving to lower floor is negotiation lever"
    },
    "possession_timeline": {
      "nearing_completion": {
        "towers": ["Tower G", "Tower H"],
        "expected_date": "June 2026",
        "target_buyer": "End-users paying rent, RTMI seekers willing to wait 6-12 months"
      },
      "under_construction": {
        "towers": ["Tower K", "Other wings"],
        "expected_date": "2027-2028",
        "target_buyer": "Investors, SOP buyers who need time to liquidate assets"
      }
    },
    "connectivity": {
      "current": {
        "ghodbunder_road": "1.5 km",
        "eastern_express_highway": "2.2 km"
      },
      "future_infra": {
        "metro_line_4": "Wadala-Kasarvadavali - Balkum station 1.8 km",
        "metro_line_5": "Thane-Bhiwandi-Kalyan - Kailash station 2.2 km",
        "thane_borivali_tunnel": "Critical for western suburb buyers (Juhu, Borivali)"
      },
      "social_infra": {
        "malls": ["Viviana Mall (3.5 km)", "Korum Mall (4.4 km)", "Wonder Mall (2.3 km)"],
        "schools": ["CP Goenka (2.4 km)", "Holy Cross (3.4 km)", "ICSE school within township"],
        "hospitals": ["Jupiter (3.3 km)", "Hiranandani (3.5 km)", "Bethany"]
      }
    },
    "usps": {
      "primary": [
        "20.5 acre Grand Central Park with 3-acre lake - Extension of your living room",
        "70% open space - Highest in Thane micro-market",
        "3.7 acre vehicle-free podium - Safe for children and elderly",
        "Integrated township with school, retail, amenities within gates",
        "Kalpataru 55+ year legacy - Grade A developer trust"
      ],
      "construction_quality": [
        "Geberit plumbing fittings - German quality, designed for high-rises to prevent leakage",
        "Mivan technology walls - Superior structural integrity",
        "Fire safety doors - Enhanced safety standards",
        "Wide doors and corridors - Premium feel",
        "Roots experience center - See construction quality before buying"
      ],
      "lifestyle": [
        "Walk-to-Work for TCS/corporate professionals",
        "Medical hub proximity for healthcare professionals",
        "Micro-climate effect - Better air quality from park greenery",
        "International design partners - Global living standards"
      ]
    },
    "payment_plans": {
      "subvention_20_80": {
        "description": "Pay 20% now, 80% on possession. Pre-EMI often deferred.",
        "target": "NRIs, rent-payers who cannot afford Rent + Pre-EMI, SOP buyers"
      },
      "construction_linked": {
        "description": "Payments linked to construction milestones",
        "target": "SOP buyers with 3-6 month asset sale timeline"
      },
      "flexi_plans": {
        "description": "Customized payment schedules",
        "target": "Buyers with complex liquidity situations"
      }
    },
    "common_objections": {
      "balcony": {
        "objection": "No balcony in all rooms",
        "rebuttal": "New constructions in Thane rarely offer balconies in all rooms due to FSI norms. Single balcony is positioned as luxury. Compensated by 3.7 acre podium and 20.5 acre park access."
      },
      "kitchen_size": {
        "objection": "Kitchen too small in 695 sqft 2BHK",
        "rebuttal": "Upgrade to 796 sqft 2BHK for larger kitchen. Or consider the functional efficiency - modular kitchen designs maximize usable space."
      },
      "vastu": {
        "objection": "Unit does not meet Vastu requirements",
        "rebuttal": "We have multiple tower orientations. Let me show you Tower B/Tower F options that align with North-East or East-West preferences. Many units specifically designed with Vastu in mind."
      },
      "possession_timeline": {
        "objection": "Possession too far for RTMI need",
        "rebuttal": "Tower G/H nearing completion (June 2026). Construction ahead of schedule - site visit will show progress. 20:80 plan means minimal outflow until possession. Worth the wait for township benefits vs standalone RTMI options."
      },
      "price": {
        "objection": "Price 10-20L higher than Dosti/Lodha",
        "rebuttal": "Visit Roots to see construction quality difference. Compare: (1) Carpet area - often 50-100 sqft more at similar price, (2) Township ecosystem vs standalone, (3) GCP access - no equivalent elsewhere, (4) Resale value and appreciation. Can also adjust floor/view for better pricing."
      },
      "high_floor_fear": {
        "objection": "Senior citizen uncomfortable with high floors",
        "rebuttal": "We have lower floor inventory available. Vehicle-free podium and park access are perfect for seniors. Multiple high-speed elevators with backup power ensure safety."
      }
    },
    "competitors": {
      "lodha": {
        "projects": ["Amara", "Sterling", "Crown", "Elanor"],
        "perceived_strength": "Lower price, high rental demand",
        "perceived_weakness": "High density, crowded, smaller carpet areas",
        "positioning": "Eternia is more exclusive and premium. Less crowded. Better carpet for similar total cost. Township ecosystem vs cluster development. Investors favor Lodha for rental, end-users prefer Eternia for living."
      },
      "dosti": {
        "projects": ["West County", "Eden"],
        "perceived_strength": "Value pricing, larger carpet at lower cost",
        "perceived_weakness": "Construction quality concerns, lower grade developer perception",
        "positioning": "Kalpataru is Grade A vs Dosti Grade B perception. Visit Roots to see quality difference. 55-year legacy vs newer developer. Premium commands premium. Long-term value and resale better with established brand."
      },
      "piramal": {
        "projects": ["Vaikunth"],
        "perceived_strength": "Luxury positioning, ISKCON Temple inside (religious/Vastu appeal)",
        "perceived_weakness": "Higher price, Balkum location less central",
        "positioning": "GCP is secular alternative to Temple amenity - 20.5 acres of nature vs religious space. Downtown Thane location is more central. Similar luxury at better value. Township ecosystem is more comprehensive."
      },
      "runwal": {
        "projects": ["25 Hour Life", "Lands End"],
        "perceived_strength": "Aggressive marketing, balcony offers, younger demographic appeal",
        "perceived_weakness": "Construction quality concerns (lift issues reported), high density, maintenance issues",
        "positioning": "Kalpataru is safer and more reliable. No reported lift or maintenance issues. 55-year track record. Quality construction verified at Roots. Township management is professional."
      },
      "raymond": {
        "projects": ["Ten X"],
        "perceived_strength": "Good layouts, efficient design",
        "perceived_weakness": "Possession timeline 2027-2028, longer wait",
        "positioning": "Eternia offers earlier possession (Tower G/H June 2026). If timeline matters, we are better. Also standalone project without township benefits."
      },
      "rustomjee": {
        "projects": ["La Familia"],
        "perceived_strength": "Good brand, earlier possession options",
        "perceived_weakness": "Smaller carpet areas, standalone vs township",
        "positioning": "Compare carpet: Eternia 796 sqft vs La Familia 688 sqft at similar price. That is 108 sqft more - worth 25L+ at current rates. No GCP equivalent. Township scale is unmatched."
      }
    },
    "buyer_personas": {
      "medical_professional": {
        "profile": "Doctors, specialists working at Jupiter/Hiranandani/Bethany",
        "drivers": "Proximity to hospitals, sanctuary from high-stress work, quality living",
        "decision_factors": "Vastu sensitive, analytical, often dual-doctor households",
        "talking_points": "Medical hub proximity, quiet residential enclave, Vastu-compliant units available"
      },
      "corporate_migrant": {
        "profile": "IT professionals from TCS, Deloitte, Accenture",
        "drivers": "Walk-to-Work, eliminate commute stress, convert rent to EMI",
        "decision_factors": "Data-driven comparators, price-per-sqft sensitive, have visited competitors",
        "talking_points": "TCS 3.7km away, lifestyle arbitrage of no commute, township amenities utilization"
      },
      "contingent_upgrader": {
        "profile": "Families from Kalwa, Dombivli, Mulund in smaller flats",
        "drivers": "Lifestyle upgrade, better amenities for children, move from standalone to township",
        "decision_factors": "SOP dependent (3-6 month cycle), cash poor but asset rich",
        "talking_points": "CLP/Flexi plans to match SOP timeline, swimming and sports for children, safety of gated township"
      },
      "nri_investor": {
        "profile": "NRIs from UAE, UK, USA seeking investment or retirement base",
        "drivers": "Brand trust, rental yield, capital appreciation, remote monitoring confidence",
        "decision_factors": "Send family to inspect, control chequebook remotely, surprisingly price-sensitive",
        "talking_points": "55-year legacy, 20:80 subvention for liquidity, professional township management, video calls for updates"
      },
      "retired_senior": {
        "profile": "Retired parents, often with children abroad",
        "drivers": "Final home, safety, community, accessible amenities",
        "decision_factors": "Avoid high floors, risk-averse, prefer RTMI or nearing completion, use PF/Gratuity/asset sale",
        "talking_points": "Vehicle-free podium safe for walks, lower floor availability, Tower G/H early possession, hospital proximity"
      },
      "business_owner": {
        "profile": "Self-employed, business owners seeking premium/trophy home",
        "drivers": "Status, exclusivity, high floor with views, space for entertainment",
        "decision_factors": "Self-funding capability, compare against bungalows/ultra-luxury, Vastu important",
        "talking_points": "4BHK/Duplex trophy units, GCP view premium floors, international design partners, prestige of Kalpataru address"
      }
    },
    "sales_tools": {
      "roots_experience_center": "Construction quality demonstration - Geberit plumbing, Mivan walls, fire doors. Converts skeptics.",
      "sample_flat": "Shows actual finishes and space. Critical for family decision-makers.",
      "gcp_walk": "Physical experience of park creates emotional connection.",
      "construction_progress": "Site visit shows ahead-of-schedule construction for possession concerns."
    },
    "negotiation_levers": {
      "floor_adjustment": "Move to lower floor to reduce floor-rise charges",
      "view_tradeoff": "Switch from GCP View to Podium/City View for better pricing",
      "payment_plan": "Offer subvention/CLP to lower perceived cost of capital",
      "unit_configuration": "Switch to smaller carpet if budget is primary constraint"
    }
  }'
);