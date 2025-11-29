export type LeadRating = 'Hot' | 'Warm' | 'Cold';

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
  date?: string;
  rating?: LeadRating;
  aiInsights?: string;
  fullAnalysis?: AnalysisResult['fullAnalysis'];
  rawData: Record<string, any>;
  
  // Additional PRD fields
  leadOwner?: string;
  managerRating?: LeadRating;
  unitInterested?: string;
  towerInterested?: string;
  
  // Lead details from PRD
  occupation?: string;
  designation?: string;
  company?: string;
  currentResidence?: string;
  workLocation?: string;
  preferredStation?: string;
  carpetArea?: string;
  floorPreference?: string;
  facing?: string;
  constructionStage?: string;
  fundingSource?: string;
  inHandFunds?: string;
}

export interface AnalysisResult {
  leadId: string;
  rating: LeadRating;
  insights: string;
  fullAnalysis?: {
    ai_rating: LeadRating;
    rating_confidence: 'High' | 'Medium' | 'Low';
    rating_rationale: string;
    persona?: string;
    summary?: string;
    key_concerns?: string[];
    next_best_action?: string;
    talking_points?: string[];
    competitor_handling?: Record<string, string>;
    objection_rebuttals?: Record<string, string>;
    extracted_signals?: {
      budget_stated?: number | null;
      in_hand_funds?: number | null;
      finalization_timeline?: string;
      decision_maker_present?: boolean;
      spot_closure_asked?: boolean;
      sample_feedback?: 'positive' | 'negative' | 'neutral' | 'not_seen';
      core_motivation?: string;
    };
  };
}
