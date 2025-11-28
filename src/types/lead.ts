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
  rawData: Record<string, any>;
}

export interface AnalysisResult {
  leadId: string;
  rating: LeadRating;
  insights: string;
}
