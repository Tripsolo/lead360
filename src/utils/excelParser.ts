import * as XLSX from 'xlsx';
import { Lead } from '@/types/lead';

export const parseExcelFile = async (file: File): Promise<Lead[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        
        const leads: Lead[] = jsonData.map((row: any, index) => ({
          id: row.LeadID || row['Lead ID'] || row.lead_id || `lead-${Date.now()}-${index}`,
          name: row.Name || row.name || row.CLIENT_NAME || row['Client Name'] || 'Unknown',
          email: row.Email || row.email || row.EMAIL || '',
          phone: row.Phone || row.phone || row.PHONE || row.Mobile || row.mobile || '',
          projectInterest: row.Project || row.project || row.PROJECT || row['Project Interest'] || '',
          budget: row.Budget || row.budget || row.BUDGET || '',
          timeline: row.Timeline || row.timeline || row.TIMELINE || row['Finalization Timeline'] || '',
          notes: row.Notes || row.notes || row.NOTES || row.Comments || row.comments || '',
          source: row.Source || row.source || row.SOURCE || '',
          date: row.Date || row.date || row.DATE || row['Last Visit'] || new Date().toISOString(),
          
          // Additional fields from PRD
          leadOwner: row.LeadOwner || row['Lead Owner'] || row.lead_owner || '',
          managerRating: row.ManagerRating || row['Manager Rating'] || row.manager_rating || undefined,
          unitInterested: row.UnitInterested || row['Unit Interested'] || row.unit_interested || '',
          towerInterested: row.TowerInterested || row['Tower Interested'] || row.tower_interested || '',
          
          // Lead details
          occupation: row.Occupation || row.occupation || '',
          designation: row.Designation || row.designation || '',
          company: row.Company || row.company || '',
          currentResidence: row.CurrentResidence || row['Current Residence'] || row.current_residence || '',
          workLocation: row.WorkLocation || row['Work Location'] || row.work_location || '',
          preferredStation: row.PreferredStation || row['Preferred Station'] || row.preferred_station || '',
          carpetArea: row.CarpetArea || row['Carpet Area'] || row.carpet_area || row['Desired Carpet Area'] || '',
          floorPreference: row.FloorPreference || row['Floor Preference'] || row.floor_preference || '',
          facing: row.Facing || row.facing || '',
          constructionStage: row.ConstructionStage || row['Construction Stage'] || row.construction_stage || '',
          fundingSource: row.FundingSource || row['Funding Source'] || row.funding_source || row['Source of Funding'] || '',
          inHandFunds: row.InHandFunds || row['In Hand Funds'] || row.in_hand_funds || '',
          
          rawData: row,
        }));
        
        resolve(leads);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it contains lead data.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};
