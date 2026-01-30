export type LeadRating = 'Hot' | 'Warm' | 'Cold';

export interface MqlEnrichment {
  mqlRating?: string;
  mqlCapability?: string;
  mqlLifestyle?: string;
  creditScore?: number;
  age?: number;
  gender?: string;
  location?: string;
  localityGrade?: string;
  lifestyle?: string;
  finalIncomeLacs?: number;
  employerName?: string;
  designation?: string;
  totalLoans?: number;
  activeLoans?: number;
  homeLoans?: number;
  autoLoans?: number;
  highestCardUsagePercent?: number;
  isAmexHolder?: boolean;
  enrichedAt?: string;
  rawResponse?: Record<string, any>;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  projectInterest?: string;
  budget?: string;
  timeline?: string;
  notes?: string;
  source?: string;
  subSource?: string;
  date?: string;
  lastVisit?: string;
  rating?: LeadRating;
  aiInsights?: string;
  fullAnalysis?: AnalysisResult['fullAnalysis'];
  rawData: Record<string, any>;
  
  // Additional PRD fields
  leadOwner?: string;
  managerRating?: LeadRating;
  manualRating?: LeadRating;
  unitInterested?: string;
  towerInterested?: string;
  
  // Lead details from PRD
  occupation?: string;
  designation?: string;
  company?: string;
  currentResidence?: string;
  buildingName?: string;
  workLocation?: string;
  preferredStation?: string;
  carpetArea?: string;
  floorPreference?: string;
  facing?: string;
  constructionStage?: string;
  fundingSource?: string;
  inHandFunds?: string;
  
  // MQL Enrichment data
  mqlEnrichment?: MqlEnrichment;
}

export interface AnalysisResult {
  leadId: string;
  rating: LeadRating;
  insights: string;
  fromCache?: boolean;
  fullAnalysis?: {
    ai_rating: LeadRating;
    rating_confidence: 'High' | 'Medium' | 'Low';
    rating_rationale: string;
    pps_score?: number;  // 0-100 composite score
    pps_breakdown?: {
      financial_capability: number;  // 0-30
      intent_engagement: number;     // 0-25
      urgency_timeline: number;      // 0-20
      product_market_fit: number;    // 0-15
      authority_dynamics: number;    // 0-10
    };
    persona?: string;
    persona_description?: string;
    summary?: string;
    key_concerns?: string[];
    concern_categories?: Array<'Price' | 'Location' | 'Possession' | 'Config' | 'Amenities' | 'Trust' | 'Others'>;
    primary_concern_category?: 'Price' | 'Location' | 'Possession' | 'Config' | 'Amenities' | 'Trust' | 'Others';
    next_best_action?: string;
    talking_points?: Array<{
      type: 'What to highlight' | 'Competitor handling' | 'Objection handling';
      point: string;
    }>;
    extracted_signals?: {
      budget_stated?: number | null;
      in_hand_funds?: number | null;
      finalization_timeline?: string;
      decision_maker_present?: boolean;
      spot_closure_asked?: boolean;
      sample_feedback?: 'positive' | 'negative' | 'neutral' | 'not_seen';
      core_motivation?: string;
    };
    // New MQL-derived fields
    mql_credit_rating?: 'High' | 'Medium' | 'Low' | null;
    overridden_fields?: string[];
    mql_data_available?: boolean;
    // Cross-sell recommendation
    cross_sell_recommendation?: {
      recommended_project: 'Primera' | 'Estella' | 'Immensa' | null;
      reason: string;
      talking_point: string;
    } | null;
  };
}
