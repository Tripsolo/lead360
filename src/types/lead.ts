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

export type NBAActionType = 
  | 'COMMUNICATION' 
  | 'CONTENT/COLLATERAL' 
  | 'OFFER' 
  | 'FOLLOW-UP' 
  | 'ESCALATION';

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
    
    // Enhanced NBA with ID and action type (Stage 3)
    next_best_action?: {
      nba_id: string;  // e.g., "NBA-OFF-001"
      action_type: NBAActionType;
      action: string;  // Specific action text (max 15 words)
      escalation_trigger?: string;
      fallback_action?: string;
    } | string;  // Backward compatibility with old string format
    
    // Enhanced talking points with TP-ID (Stage 3)
    talking_points?: Array<{
      tp_id?: string;  // e.g., "TP-ECO-007"
      type: 'What to highlight' | 'Competitor handling' | 'Objection handling';
      point: string;  // Contextualized version
      source_text?: string;  // Original framework text
    }>;
    
    // Objection classification (Stage 3)
    objection_categories_detected?: string[];
    primary_objection?: string;
    secondary_objections?: string[];
    
    // Safety tracking (Stage 3)
    safety_check_triggered?: string | null;
    
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
    // Cross-sell recommendation with guardrails
    cross_sell_recommendation?: {
      recommended_project: 'Primera' | 'Estella' | 'Immensa' | null;
      recommended_config?: '2 BHK' | '3 BHK' | '4 BHK' | null;
      price_range_cr?: string;
      possession_date?: string;
      reason: string;
      talking_point: string;
      rules_evaluation?: {
        budget_check: 'PASS' | 'FAIL' | 'N/A';
        possession_check: 'PASS' | 'FAIL' | 'N/A';
        size_check: 'PASS' | 'FAIL' | 'N/A';
        room_check: 'PASS' | 'FAIL' | 'N/A';
      };
    } | null;
  };
}
