import * as XLSX from 'xlsx';
import { Lead } from '@/types/lead';
import { ExcelSchema } from '@/config/projects';
import { validateExcelSchema } from './schemaValidator';

export const parseExcelFile = async (
  file: File,
  schema?: ExcelSchema
): Promise<Lead[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Validate schema if provided
        if (schema) {
          const headers = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] as string[];
          const validation = validateExcelSchema(headers, schema);
          
          if (!validation.isValid) {
            throw new Error(validation.message || 'Schema validation failed');
          }
        }
        
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        
        const leads: Lead[] = jsonData.map((row: any, index) => {
          // Use schema mappings if provided, otherwise fall back to generic parsing
          const getValue = (excelColumn: string, fallbacks: string[] = []) => {
            if (schema?.columnMappings[excelColumn]) {
              return row[excelColumn] || '';
            }
            // Fallback to old parsing logic
            for (const key of [excelColumn, ...fallbacks]) {
              if (row[key]) return row[key];
            }
            return '';
          };

          return {
          id: row['Opportunity ID'] || row.LeadID || row['Lead ID'] || row.lead_id || `lead-${Date.now()}-${index}`,
          name: row['Opportunity Name'] || row.Name || row.name || row.CLIENT_NAME || row['Client Name'] || 'Unknown',
          email: getValue('Email', ['email', 'EMAIL']),
          phone: row['Mobile'] || row.Phone || row.phone || row.PHONE || row.mobile || '',
          projectInterest: row['Project'] || row.project || row.PROJECT || row['Project Interest'] || '',
          budget: row.Budget || row.budget || row.BUDGET || '',
          timeline: row['Expected Date of Closure'] || row.Timeline || row.timeline || row.TIMELINE || row['Finalization Timeline'] || '',
          notes: row['Last Follow Up Comments'] || row.Notes || row.notes || row.NOTES || row.Comments || row.comments || '',
          source: row.Source || row.source || row.SOURCE || '',
          date: row['Walkin Date'] || row.Date || row.date || row.DATE || row['Last Visit'] || new Date().toISOString(),
          
          // Additional fields from PRD
          leadOwner: row['Name of Closing Manager'] || row.LeadOwner || row['Lead Owner'] || row.lead_owner || '',
          managerRating: row['Walkin Manual Rating'] || row.ManagerRating || row['Manager Rating'] || row.manager_rating || undefined,
          unitInterested: row['Interested Unit 1'] || row.UnitInterested || row['Unit Interested'] || row.unit_interested || '',
          towerInterested: row['Interested Tower 1'] || row.TowerInterested || row['Tower Interested'] || row.tower_interested || '',
          
          // Lead details
          occupation: row['Occupation'] || row.occupation || '',
          designation: row['Designation'] || row.designation || '',
          company: row['Place of Work (Company Name)'] || row.Company || row.company || '',
          currentResidence: row['Location of Residence'] || row.CurrentResidence || row['Current Residence'] || row.current_residence || '',
          workLocation: row['Location of Work'] || row.WorkLocation || row['Work Location'] || row.work_location || '',
          preferredStation: row['Nearest Railway/Metro Station'] || row.PreferredStation || row['Preferred Station'] || row.preferred_station || '',
          carpetArea: row['Desired Carpet Area (Post-Walkin)'] || row.CarpetArea || row['Carpet Area'] || row.carpet_area || row['Desired Carpet Area'] || '',
          floorPreference: row['Desired Floor Band'] || row.FloorPreference || row['Floor Preference'] || row.floor_preference || '',
          facing: row['Desired Facing'] || row.Facing || row.facing || '',
          constructionStage: row['Stage of Construction (Post-Walkin)'] || row.ConstructionStage || row['Construction Stage'] || row.construction_stage || '',
          fundingSource: row['Source of Funding'] || row.FundingSource || row['Funding Source'] || row.funding_source || '',
          inHandFunds: row.InHandFunds || row['In Hand Funds'] || row.in_hand_funds || '',
          
          // Store all raw data including Kalpataru-specific fields
          rawData: row,
        };
        });
        
        resolve(leads);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure it contains lead data.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};
