import * as XLSX from 'xlsx';
import { Lead } from '@/types/lead';

export const exportLeadsToExcel = (leads: Lead[]) => {
  // Prepare data for export
  const exportData = leads.map(lead => ({
    'Lead ID': lead.id,
    'Name': lead.name,
    'Phone': lead.phone || '',
    'Email': lead.email || '',
    'Lead Owner': lead.leadOwner || '',
    'Last Visit': lead.date ? new Date(lead.date).toLocaleDateString() : '',
    'AI Rating': lead.rating || '',
    'Rating Confidence': lead.fullAnalysis?.rating_confidence || '',
    'Manager Rating': lead.managerRating || '',
    'Persona': lead.fullAnalysis?.persona || '',
    'Summary': lead.fullAnalysis?.summary || '',
    'Key Concern': lead.fullAnalysis?.key_concerns?.[0] || '',
    'Next Best Action': lead.fullAnalysis?.next_best_action || '',
    'Budget': lead.budget || '',
    'In-Hand Funds': lead.fullAnalysis?.extracted_signals?.in_hand_funds 
      ? `₹${(lead.fullAnalysis.extracted_signals.in_hand_funds / 100000).toFixed(2)}L`
      : '',
    'Timeline': lead.timeline || '',
    'Occupation': lead.occupation || '',
    'Current Residence': lead.currentResidence || '',
    'Work Location': lead.workLocation || '',
    'Carpet Area': lead.carpetArea || '',
    'Floor Preference': lead.floorPreference || '',
    'Facing': lead.facing || '',
    'Rating Rationale': lead.fullAnalysis?.rating_rationale || '',
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Lead ID
    { wch: 20 }, // Name
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 15 }, // Lead Owner
    { wch: 12 }, // Last Visit
    { wch: 10 }, // AI Rating
    { wch: 15 }, // Rating Confidence
    { wch: 10 }, // Manager Rating
    { wch: 30 }, // Persona
    { wch: 40 }, // Summary
    { wch: 30 }, // Key Concern
    { wch: 35 }, // Next Best Action
    { wch: 15 }, // Budget
    { wch: 15 }, // In-Hand Funds
    { wch: 15 }, // Timeline
    { wch: 20 }, // Occupation
    { wch: 20 }, // Current Residence
    { wch: 20 }, // Work Location
    { wch: 12 }, // Carpet Area
    { wch: 15 }, // Floor Preference
    { wch: 12 }, // Facing
    { wch: 40 }, // Rating Rationale
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Leads Analysis');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `CRM_Leads_Analysis_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);
};
