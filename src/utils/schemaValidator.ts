import { ExcelSchema } from '@/config/projects';

export interface ValidationResult {
  isValid: boolean;
  missingColumns: string[];
  message?: string;
}

export const validateExcelSchema = (
  headers: string[],
  schema: ExcelSchema
): ValidationResult => {
  // Check for missing required columns (exact match)
  const missingColumns = schema.requiredColumns.filter(
    requiredCol => !headers.includes(requiredCol)
  );

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      missingColumns,
      message: `Missing required columns: ${missingColumns.join(', ')}`
    };
  }

  return {
    isValid: true,
    missingColumns: []
  };
};
