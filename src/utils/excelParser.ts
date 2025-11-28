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
          id: `lead-${Date.now()}-${index}`,
          name: row.Name || row.name || row.CLIENT_NAME || row['Client Name'] || 'Unknown',
          email: row.Email || row.email || row.EMAIL || '',
          phone: row.Phone || row.phone || row.PHONE || row.Mobile || row.mobile || '',
          projectInterest: row.Project || row.project || row.PROJECT || row['Project Interest'] || '',
          budget: row.Budget || row.budget || row.BUDGET || '',
          timeline: row.Timeline || row.timeline || row.TIMELINE || '',
          notes: row.Notes || row.notes || row.NOTES || row.Comments || row.comments || '',
          source: row.Source || row.source || row.SOURCE || '',
          date: row.Date || row.date || row.DATE || new Date().toISOString(),
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
