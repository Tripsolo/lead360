import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface DerivedLeadData {
  // Identification
  lead_id: string;
  name: string;
  phone: string;
  manager: string;
  manager_rating: string;
  project: string;
  
  // AI Ratings & PPS
  ai_rating: string;
  pps_score: number | null;
  pps_financial_capability: number | null;
  pps_intent_engagement: number | null;
  pps_urgency_timeline: number | null;
  pps_product_market_fit: number | null;
  pps_authority_dynamics: number | null;
  rating_rationale: string;
  rating_confidence: string;
  
  // Persona & Insights
  persona: string;
  persona_description: string;
  summary: string;
  next_best_action: string;
  
  // Concerns
  primary_concern_category: string;
  key_concern_1: string;
  key_concern_2: string;
  key_concern_3: string;
  all_concern_categories: string;
  
  // Extracted Signals
  budget_stated_cr: string;
  in_hand_funds_percent: string;
  finalization_timeline: string;
  decision_maker_present: string;
  spot_closure_asked: string;
  sample_feedback: string;
  core_motivation: string;
  
  // Talking Points
  talking_point_1_type: string;
  talking_point_1: string;
  talking_point_2_type: string;
  talking_point_2: string;
  talking_point_3_type: string;
  talking_point_3: string;
  
  // MQL Enrichment
  mql_rating: string;
  mql_capability: string;
  mql_lifestyle: string;
  mql_credit_rating: string;
  mql_investor_signal: string;
  age: number | null;
  gender: string;
  locality_grade: string;
  final_income_lacs: number | null;
  mql_designation: string;
  employer_name: string;
  total_loans: number | null;
  active_loans: number | null;
  home_loans: number | null;
  
  // CIS Scores
  cis_total: number | null;
  cis_rating: string;
  compliance_score: number | null;
  insight_score: number | null;
  
  // CIS Compliance Flags
  has_budget: string;
  has_carpet_requirement: string;
  has_in_hand_funds: string;
  has_timeline: string;
  has_possession_preference: string;
  has_core_motivation: string;
  has_current_residence: string;
  has_family_composition: string;
  has_income_funding: string;
  has_spot_closure_attempt: string;
  
  // CIS Insight Flags
  has_competitor_comparison: string;
  has_pricing_gap_quantified: string;
  has_sample_feedback: string;
  has_non_booking_reason: string;
  has_decision_maker_context: string;
  has_lifestyle_context: string;
  has_detailed_narrative: string;
  
  // Source Tracking
  source: string;
  sub_source: string;
}

export const exportDerivedFieldsToCSV = async (projectId?: string): Promise<void> => {
  // Fetch all leads with their analyses and enrichments
  let leadsQuery = supabase
    .from('leads')
    .select('*');
  
  if (projectId) {
    leadsQuery = leadsQuery.eq('project_id', projectId);
  }
  
  const { data: leads, error: leadsError } = await leadsQuery;
  
  if (leadsError) {
    throw new Error(`Failed to fetch leads: ${leadsError.message}`);
  }
  
  if (!leads || leads.length === 0) {
    throw new Error('No leads found to export');
  }
  
  // Fetch analyses for these leads
  const leadIds = leads.map(l => l.lead_id);
  const { data: analyses, error: analysesError } = await supabase
    .from('lead_analyses')
    .select('*')
    .in('lead_id', leadIds);
  
  if (analysesError) {
    throw new Error(`Failed to fetch analyses: ${analysesError.message}`);
  }
  
  // Fetch enrichments for these leads
  const { data: enrichments, error: enrichmentsError } = await supabase
    .from('lead_enrichments')
    .select('*')
    .in('lead_id', leadIds);
  
  if (enrichmentsError) {
    throw new Error(`Failed to fetch enrichments: ${enrichmentsError.message}`);
  }
  
  // Create lookup maps
  const analysisMap = new Map(analyses?.map(a => [a.lead_id, a]) || []);
  const enrichmentMap = new Map(enrichments?.map(e => [e.lead_id, e]) || []);
  
  // Transform data into export format
  const exportData: DerivedLeadData[] = leads.map(lead => {
    const crmData = lead.crm_data as Record<string, any>;
    const analysis = analysisMap.get(lead.lead_id);
    const enrichment = enrichmentMap.get(lead.lead_id);
    
    const fullAnalysis = analysis?.full_analysis as Record<string, any> | null;
    const extractedSignals = fullAnalysis?.extracted_signals || {};
    const ppsBreakdown = fullAnalysis?.pps_breakdown || {};
    const talkingPoints = fullAnalysis?.talking_points || [];
    const keyConcerns = fullAnalysis?.key_concerns || [];
    const concernCategories = fullAnalysis?.concern_categories || [];
    const cisData = extractedSignals?.crm_compliance_assessment || {};
    const complianceFlags = cisData?.compliance_flags || {};
    const insightFlags = cisData?.insight_flags || {};
    
    // Format budget as crores
    const budgetStated = extractedSignals?.budget_stated;
    const budgetCr = budgetStated ? `₹${(Number(budgetStated)).toFixed(2)} Cr` : '';
    
    // Format in-hand funds as percentage
    const inHandFunds = extractedSignals?.in_hand_funds;
    let inHandPercent = '';
    if (inHandFunds !== null && inHandFunds !== undefined) {
      if (Number(inHandFunds) > 100) {
        // It's in lakhs
        inHandPercent = `₹${(Number(inHandFunds) / 100).toFixed(1)}L`;
      } else {
        inHandPercent = `${Number(inHandFunds)}%`;
      }
    }
    
    // Derive MQL investor signal from loan data
    const homeLoansActive = enrichment?.home_loan_active || 0;
    const investorSignal = homeLoansActive >= 2 ? 'Yes' : 'No';
    
    return {
      // Identification
      lead_id: lead.lead_id || '',
      name: crmData?.['Name'] || crmData?.['Customer Name'] || '',
      phone: crmData?.['Phone'] || crmData?.['Mobile'] || '',
      manager: crmData?.['Name of Closing Manager'] || crmData?.['Lead Owner'] || '',
      manager_rating: crmData?.['Manager Final Rating'] || crmData?.['Manual Rating'] || '',
      project: lead.project_id || '',
      
      // AI Ratings & PPS
      ai_rating: analysis?.rating || '',
      pps_score: fullAnalysis?.pps_score || null,
      pps_financial_capability: ppsBreakdown?.financial_capability || null,
      pps_intent_engagement: ppsBreakdown?.intent_engagement || null,
      pps_urgency_timeline: ppsBreakdown?.urgency_timeline || null,
      pps_product_market_fit: ppsBreakdown?.product_market_fit || null,
      pps_authority_dynamics: ppsBreakdown?.authority_dynamics || null,
      rating_rationale: fullAnalysis?.rating_rationale || '',
      rating_confidence: fullAnalysis?.rating_confidence || '',
      
      // Persona & Insights
      persona: fullAnalysis?.persona || '',
      persona_description: fullAnalysis?.persona_description || '',
      summary: fullAnalysis?.summary || '',
      next_best_action: fullAnalysis?.next_best_action || '',
      
      // Concerns
      primary_concern_category: fullAnalysis?.primary_concern_category || '',
      key_concern_1: keyConcerns[0] || '',
      key_concern_2: keyConcerns[1] || '',
      key_concern_3: keyConcerns[2] || '',
      all_concern_categories: concernCategories.join(', '),
      
      // Extracted Signals
      budget_stated_cr: budgetCr,
      in_hand_funds_percent: inHandPercent,
      finalization_timeline: extractedSignals?.finalization_timeline || '',
      decision_maker_present: extractedSignals?.decision_maker_present === true ? 'Yes' : 
                              extractedSignals?.decision_maker_present === false ? 'No' : '',
      spot_closure_asked: extractedSignals?.spot_closure_asked === true ? 'Yes' : 
                          extractedSignals?.spot_closure_asked === false ? 'No' : '',
      sample_feedback: extractedSignals?.sample_feedback || '',
      core_motivation: extractedSignals?.core_motivation || '',
      
      // Talking Points
      talking_point_1_type: talkingPoints[0]?.type || '',
      talking_point_1: talkingPoints[0]?.point || '',
      talking_point_2_type: talkingPoints[1]?.type || '',
      talking_point_2: talkingPoints[1]?.point || '',
      talking_point_3_type: talkingPoints[2]?.type || '',
      talking_point_3: talkingPoints[2]?.point || '',
      
      // MQL Enrichment
      mql_rating: enrichment?.mql_rating || '',
      mql_capability: enrichment?.mql_capability || '',
      mql_lifestyle: enrichment?.mql_lifestyle || '',
      mql_credit_rating: fullAnalysis?.mql_credit_rating || '',
      mql_investor_signal: investorSignal,
      age: enrichment?.age || null,
      gender: enrichment?.gender || '',
      locality_grade: enrichment?.locality_grade || '',
      final_income_lacs: enrichment?.final_income_lacs || null,
      mql_designation: enrichment?.designation || '',
      employer_name: enrichment?.employer_name || '',
      total_loans: enrichment?.total_loans || null,
      active_loans: enrichment?.active_loans || null,
      home_loans: enrichment?.home_loans || null,
      
      // CIS Scores
      cis_total: cisData?.cis_total || null,
      cis_rating: cisData?.cis_rating || '',
      compliance_score: cisData?.compliance_score || null,
      insight_score: cisData?.insight_score || null,
      
      // CIS Compliance Flags
      has_budget: complianceFlags?.has_budget ? 'Yes' : 'No',
      has_carpet_requirement: complianceFlags?.has_carpet_requirement ? 'Yes' : 'No',
      has_in_hand_funds: complianceFlags?.has_in_hand_funds ? 'Yes' : 'No',
      has_timeline: complianceFlags?.has_timeline ? 'Yes' : 'No',
      has_possession_preference: complianceFlags?.has_possession_preference ? 'Yes' : 'No',
      has_core_motivation: complianceFlags?.has_core_motivation ? 'Yes' : 'No',
      has_current_residence: complianceFlags?.has_current_residence ? 'Yes' : 'No',
      has_family_composition: complianceFlags?.has_family_composition ? 'Yes' : 'No',
      has_income_funding: complianceFlags?.has_income_funding ? 'Yes' : 'No',
      has_spot_closure_attempt: complianceFlags?.has_spot_closure_attempt ? 'Yes' : 'No',
      
      // CIS Insight Flags
      has_competitor_comparison: insightFlags?.has_competitor_comparison ? 'Yes' : 'No',
      has_pricing_gap_quantified: insightFlags?.has_pricing_gap_quantified ? 'Yes' : 'No',
      has_sample_feedback: insightFlags?.has_sample_feedback ? 'Yes' : 'No',
      has_non_booking_reason: insightFlags?.has_non_booking_reason ? 'Yes' : 'No',
      has_decision_maker_context: insightFlags?.has_decision_maker_context ? 'Yes' : 'No',
      has_lifestyle_context: insightFlags?.has_lifestyle_context ? 'Yes' : 'No',
      has_detailed_narrative: insightFlags?.has_detailed_narrative ? 'Yes' : 'No',
      
      // Source Tracking
      source: crmData?.['Sales Walkin Source'] || 'Unknown',
      sub_source: crmData?.['Sales Walkin Sub Source'] || 'Unknown',
    };
  });
  
  // Define column headers with friendly names
  const columnHeaders: Record<keyof DerivedLeadData, string> = {
    lead_id: 'Lead ID',
    name: 'Name',
    phone: 'Phone',
    manager: 'Manager',
    manager_rating: 'Manager Rating',
    project: 'Project',
    ai_rating: 'AI Rating',
    pps_score: 'PPS Score',
    pps_financial_capability: 'PPS - Financial Capability (30)',
    pps_intent_engagement: 'PPS - Intent & Engagement (25)',
    pps_urgency_timeline: 'PPS - Urgency & Timeline (20)',
    pps_product_market_fit: 'PPS - Product-Market Fit (15)',
    pps_authority_dynamics: 'PPS - Authority Dynamics (10)',
    rating_rationale: 'Rating Rationale',
    rating_confidence: 'Rating Confidence',
    persona: 'Persona',
    persona_description: 'Persona Description',
    summary: 'Summary',
    next_best_action: 'Next Best Action',
    primary_concern_category: 'Primary Concern',
    key_concern_1: 'Key Concern 1',
    key_concern_2: 'Key Concern 2',
    key_concern_3: 'Key Concern 3',
    all_concern_categories: 'All Concern Categories',
    budget_stated_cr: 'Budget Stated (Cr)',
    in_hand_funds_percent: 'In-Hand Funds',
    finalization_timeline: 'Finalization Timeline',
    decision_maker_present: 'Decision Maker Present',
    spot_closure_asked: 'Spot Closure Asked',
    sample_feedback: 'Sample Feedback',
    core_motivation: 'Core Motivation',
    talking_point_1_type: 'Talking Point 1 Type',
    talking_point_1: 'Talking Point 1',
    talking_point_2_type: 'Talking Point 2 Type',
    talking_point_2: 'Talking Point 2',
    talking_point_3_type: 'Talking Point 3 Type',
    talking_point_3: 'Talking Point 3',
    mql_rating: 'MQL Rating',
    mql_capability: 'MQL Capability',
    mql_lifestyle: 'MQL Lifestyle',
    mql_credit_rating: 'MQL Credit Rating',
    mql_investor_signal: 'MQL Investor Signal',
    age: 'Age',
    gender: 'Gender',
    locality_grade: 'Locality Grade',
    final_income_lacs: 'Final Income (Lacs)',
    mql_designation: 'MQL Designation',
    employer_name: 'Employer Name',
    total_loans: 'Total Loans',
    active_loans: 'Active Loans',
    home_loans: 'Home Loans',
    cis_total: 'CIS Total Score',
    cis_rating: 'CIS Rating',
    compliance_score: 'CIS Compliance Score (50)',
    insight_score: 'CIS Insight Score (50)',
    has_budget: 'CIS: Budget Captured',
    has_carpet_requirement: 'CIS: Carpet Requirement',
    has_in_hand_funds: 'CIS: In-Hand Funds',
    has_timeline: 'CIS: Timeline',
    has_possession_preference: 'CIS: Possession Pref',
    has_core_motivation: 'CIS: Core Motivation',
    has_current_residence: 'CIS: Current Residence',
    has_family_composition: 'CIS: Family Composition',
    has_income_funding: 'CIS: Income/Funding',
    has_spot_closure_attempt: 'CIS: Spot Closure Attempt',
    has_competitor_comparison: 'CIS: Competitor Comparison',
    has_pricing_gap_quantified: 'CIS: Pricing Gap Quantified',
    has_sample_feedback: 'CIS: Sample Feedback',
    has_non_booking_reason: 'CIS: Non-Booking Reason',
    has_decision_maker_context: 'CIS: Decision Maker Context',
    has_lifestyle_context: 'CIS: Lifestyle Context',
    has_detailed_narrative: 'CIS: Detailed Narrative',
    source: 'Source',
    sub_source: 'Sub Source',
  };
  
  // Convert to array of objects with friendly column names
  const formattedData = exportData.map(row => {
    const formatted: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const header = columnHeaders[key as keyof DerivedLeadData] || key;
      formatted[header] = value;
    }
    return formatted;
  });
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // Lead ID
    { wch: 20 }, // Name
    { wch: 12 }, // Phone
    { wch: 18 }, // Manager
    { wch: 12 }, // Manager Rating
    { wch: 15 }, // Project
    { wch: 10 }, // AI Rating
    { wch: 10 }, // PPS Score
    { wch: 25 }, // PPS Financial
    { wch: 25 }, // PPS Intent
    { wch: 25 }, // PPS Urgency
    { wch: 25 }, // PPS PMF
    { wch: 25 }, // PPS Authority
    { wch: 50 }, // Rating Rationale
    { wch: 15 }, // Rating Confidence
    { wch: 20 }, // Persona
    { wch: 50 }, // Persona Description
    { wch: 50 }, // Summary
    { wch: 40 }, // Next Best Action
    { wch: 15 }, // Primary Concern
    { wch: 30 }, // Key Concern 1
    { wch: 30 }, // Key Concern 2
    { wch: 30 }, // Key Concern 3
    { wch: 30 }, // All Concerns
    { wch: 15 }, // Budget
    { wch: 15 }, // In-Hand
    { wch: 20 }, // Timeline
    { wch: 18 }, // Decision Maker
    { wch: 15 }, // Spot Closure
    { wch: 15 }, // Sample Feedback
    { wch: 30 }, // Core Motivation
    { wch: 20 }, // TP1 Type
    { wch: 40 }, // TP1
    { wch: 20 }, // TP2 Type
    { wch: 40 }, // TP2
    { wch: 20 }, // TP3 Type
    { wch: 40 }, // TP3
    { wch: 10 }, // MQL Rating
    { wch: 15 }, // MQL Capability
    { wch: 15 }, // MQL Lifestyle
    { wch: 15 }, // MQL Credit
    { wch: 18 }, // MQL Investor
    { wch: 8 },  // Age
    { wch: 10 }, // Gender
    { wch: 15 }, // Locality
    { wch: 18 }, // Income
    { wch: 20 }, // Designation
    { wch: 25 }, // Employer
    { wch: 12 }, // Total Loans
    { wch: 12 }, // Active Loans
    { wch: 12 }, // Home Loans
    { wch: 15 }, // CIS Total
    { wch: 12 }, // CIS Rating
    { wch: 22 }, // Compliance Score
    { wch: 20 }, // Insight Score
    // CIS flags - all similar width
    ...Array(17).fill({ wch: 22 }),
    { wch: 15 }, // Source
    { wch: 20 }, // Sub Source
  ];
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Derived Lead Data');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Customer360_Derived_Data_${timestamp}.csv`;
  
  // Export as CSV
  XLSX.writeFile(wb, filename, { bookType: 'csv' });
};
