import * as XLSX from 'xlsx';
import { Lead } from '@/types/lead';

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(v);
  return String(v);
};

const fmtNba = (nba: Lead['fullAnalysis']extends infer A ? A extends { next_best_action?: infer N } ? N : never : never) => {
  if (!nba) return { id: '', type: '', action: '', escalation: '', fallback: '' };
  if (typeof nba === 'string') return { id: '', type: '', action: nba, escalation: '', fallback: '' };
  return {
    id: nba.nba_id || '',
    type: nba.action_type || '',
    action: nba.action || '',
    escalation: nba.escalation_trigger || '',
    fallback: nba.fallback_action || '',
  };
};

const fmtTalkingPoints = (tp: Lead['fullAnalysis'] extends infer A ? A extends { talking_points?: infer T } ? T : never : never): string => {
  if (!tp || !Array.isArray(tp)) return '';
  return tp.map((p, i) => {
    const prefix = p.tp_id ? `[${p.tp_id}] ` : '';
    const type = p.type ? `(${p.type}) ` : '';
    return `${i + 1}. ${prefix}${type}${p.point}`;
  }).join('\n');
};

export const exportLeadsToExcel = (leads: Lead[]) => {
  const exportData = leads.map(lead => {
    const fa = lead.fullAnalysis;
    const mql = lead.mqlEnrichment;
    const nba = fmtNba(fa?.next_best_action);
    const signals = fa?.extracted_signals;
    const pps = fa?.pps_breakdown;
    const cs = fa?.cross_sell_recommendation;

    return {
      // CRM Fields
      'Lead ID': lead.id,
      'Name': lead.name,
      'Phone': lead.phone || '',
      'Email': lead.email || '',
      'Lead Owner': lead.leadOwner || '',
      'Project Interest': lead.projectInterest || '',
      'Source': lead.source || '',
      'Sub Source': lead.subSource || '',
      'Last Visit': lead.date ? new Date(lead.date).toLocaleDateString() : '',
      'Manager Rating': lead.managerRating || '',
      'Unit Interested': lead.unitInterested || '',
      'Tower Interested': lead.towerInterested || '',
      'Budget': lead.budget || '',
      'Timeline': lead.timeline || '',
      'Occupation': lead.occupation || '',
      'Designation': lead.designation || '',
      'Company': lead.company || '',
      'Current Residence': lead.currentResidence || '',
      'Building Name': lead.buildingName || '',
      'Work Location': lead.workLocation || '',
      'Preferred Station': lead.preferredStation || '',
      'Carpet Area': lead.carpetArea || '',
      'Floor Preference': lead.floorPreference || '',
      'Facing': lead.facing || '',
      'Construction Stage': lead.constructionStage || '',
      'Funding Source': lead.fundingSource || '',
      'In-Hand Funds (CRM)': lead.inHandFunds || '',

      // MQL Enrichment Fields
      'MQL Rating': mql?.mqlRating || '',
      'MQL Capability': mql?.mqlCapability || '',
      'MQL Lifestyle': mql?.mqlLifestyle || '',
      'Credit Score': fmt(mql?.creditScore),
      'Age': fmt(mql?.age),
      'Gender': mql?.gender || '',
      'Location (MQL)': mql?.location || '',
      'Locality Grade': mql?.localityGrade || '',
      'Lifestyle': mql?.lifestyle || '',
      'Final Income (Lacs)': fmt(mql?.finalIncomeLacs),
      'Employer Name': mql?.employerName || '',
      'Designation (MQL)': mql?.designation || '',
      'Total Loans': fmt(mql?.totalLoans),
      'Active Loans': fmt(mql?.activeLoans),
      'Home Loans': fmt(mql?.homeLoans),
      'Auto Loans': fmt(mql?.autoLoans),
      'Highest Card Usage %': fmt(mql?.highestCardUsagePercent),
      'Amex Holder': fmt(mql?.isAmexHolder),

      // AI Analysis Fields
      'AI Rating': lead.rating || '',
      'Rating Confidence': fa?.rating_confidence || '',
      'Rating Rationale': fa?.rating_rationale || '',
      'PPS Score': fmt(fa?.pps_score),
      'PPS - Financial Capability': fmt(pps?.financial_capability),
      'PPS - Intent & Engagement': fmt(pps?.intent_engagement),
      'PPS - Urgency & Timeline': fmt(pps?.urgency_timeline),
      'PPS - Product Market Fit': fmt(pps?.product_market_fit),
      'PPS - Authority Dynamics': fmt(pps?.authority_dynamics),
      'Persona': fa?.persona || '',
      'Persona Description': fa?.persona_description || '',
      'Summary': fa?.summary || '',
      'Key Concerns': fa?.key_concerns?.join('; ') || '',
      'Primary Concern Category': fa?.primary_concern_category || '',
      'All Concern Categories': fa?.concern_categories?.join('; ') || '',
      'NBA ID': nba.id,
      'NBA Action Type': nba.type,
      'NBA Action': nba.action,
      'NBA Escalation Trigger': nba.escalation,
      'NBA Fallback Action': nba.fallback,
      'Talking Points': fmtTalkingPoints(fa?.talking_points),
      'Objection Categories': fa?.objection_categories_detected?.join('; ') || '',
      'Primary Objection': fa?.primary_objection || '',
      'Secondary Objections': fa?.secondary_objections?.join('; ') || '',
      'Budget Stated': fmt(signals?.budget_stated),
      'In-Hand Funds (Signal)': signals?.in_hand_funds ? `₹${(signals.in_hand_funds / 100000).toFixed(2)}L` : '',
      'Finalization Timeline': signals?.finalization_timeline || '',
      'Decision Maker Present': fmt(signals?.decision_maker_present),
      'Spot Closure Asked': fmt(signals?.spot_closure_asked),
      'Sample Feedback': signals?.sample_feedback || '',
      'Core Motivation': signals?.core_motivation || '',
      'MQL Credit Rating': fa?.mql_credit_rating || '',
      'Cross-sell Project': cs?.recommended_project || '',
      'Cross-sell Config': cs?.recommended_config || '',
      'Cross-sell Price Range': cs?.price_range_cr || '',
      'Cross-sell Reason': cs?.reason || '',
      'Cross-sell Talking Point': cs?.talking_point || '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    15, 20, 15, 25, 15, 20, 15, 15, 12, 12, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 18, 12, 15, 12, 18, 15, 15,
    10, 15, 15, 10, 8, 10, 15, 12, 12, 15, 15, 15, 10, 10, 10, 18, 10,
    10, 15, 40, 10, 10, 10, 10, 10, 25, 20, 15, 45, 15, 15, 18, 20, 12, 15, 50, 25, 20, 20, 15, 18, 12, 12, 15, 15, 15, 15, 18, 25, 30,
  ].map(wch => ({ wch }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Leads Analysis');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `CRM_Leads_Analysis_${timestamp}.xlsx`);
};
