/**
 * Lead Data Standardization Utility
 * 
 * Centralizes the logic for merging CRM and MQL data according to defined precedence rules.
 * Ensures consistent data for both UI display and LLM inference.
 */

import { MqlEnrichment } from '@/types/lead';

// ============= Types =============

export interface StandardizedLead {
  // Identity
  name: string;
  phone: string;
  email: string;
  
  // Demographics (MQL preferred where available)
  age: number | null;
  gender: string | null;
  
  // Professional (Mixed precedence)
  designation: string | null;      // CRM > MQL
  employer: string | null;         // MQL > CRM (if not empty)
  occupationType: string | null;   // CRM > MQL
  
  // Location (MQL preferred where available)
  location: string | null;         // MQL > CRM (if not empty)
  localityGrade: string | null;    // MQL > CRM (if not empty)
  
  // Financial
  income: number | null;           // MQL > CRM (if not empty)
  budget: {
    crmStated: string | null;
    mqlDerived: number | null;
    effective: string | null;
  };
  
  // Metadata - tracks which source was used for each field
  dataSource: DataSourceMap;
  
  // Conflict flags (for transparency)
  conflicts: DataConflict[];
}

export interface DataSourceMap {
  designation: 'crm' | 'mql' | 'none';
  employer: 'crm' | 'mql' | 'none';
  location: 'crm' | 'mql' | 'none';
  age: 'crm' | 'mql' | 'none';
  gender: 'crm' | 'mql' | 'none';
  localityGrade: 'crm' | 'mql' | 'none';
  income: 'crm' | 'mql' | 'none';
  occupationType: 'crm' | 'mql' | 'none';
}

export interface DataConflict {
  field: string;
  crmValue: any;
  mqlValue: any;
  selectedSource: 'crm' | 'mql';
  reason: string;
}

// CRM data structure (from crm_data JSON)
export interface CrmData {
  'Opportunity Name'?: string;
  'Mobile'?: string;
  'Email Id'?: string;
  'Designation'?: string;
  'Place of Work (Company Name)'?: string;
  'Location of Residence'?: string;
  'Current Residence'?: string;
  'Occupation'?: string;
  'Budget'?: string;
  [key: string]: any;
}

// ============= Helper Functions =============

/**
 * Checks if a value is considered "empty" for precedence purposes
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === '' ||
      normalized === 'n/a' ||
      normalized === 'na' ||
      normalized === 'unknown' ||
      normalized === 'null' ||
      normalized === 'undefined'
    );
  }
  if (typeof value === 'number') {
    return isNaN(value);
  }
  return false;
}

/**
 * Gets a value with MQL preference (MQL wins if not empty, else CRM)
 */
function getMqlPreferred<T>(mqlValue: T | undefined, crmValue: T | undefined): { value: T | null; source: 'crm' | 'mql' | 'none' } {
  if (!isEmpty(mqlValue)) {
    return { value: mqlValue as T, source: 'mql' };
  }
  if (!isEmpty(crmValue)) {
    return { value: crmValue as T, source: 'crm' };
  }
  return { value: null, source: 'none' };
}

/**
 * Gets a value with CRM preference (CRM always wins if available)
 */
function getCrmPreferred<T>(crmValue: T | undefined, mqlValue: T | undefined): { value: T | null; source: 'crm' | 'mql' | 'none' } {
  if (!isEmpty(crmValue)) {
    return { value: crmValue as T, source: 'crm' };
  }
  if (!isEmpty(mqlValue)) {
    return { value: mqlValue as T, source: 'mql' };
  }
  return { value: null, source: 'none' };
}

/**
 * Detects conflicts between CRM and MQL values
 */
function detectConflict(
  field: string,
  crmValue: any,
  mqlValue: any,
  selectedSource: 'crm' | 'mql',
  reason: string
): DataConflict | null {
  // Only record conflict if both sources have non-empty values
  if (!isEmpty(crmValue) && !isEmpty(mqlValue) && crmValue !== mqlValue) {
    return {
      field,
      crmValue,
      mqlValue,
      selectedSource,
      reason,
    };
  }
  return null;
}

// ============= Main Standardization Function =============

/**
 * Standardizes lead data by merging CRM and MQL according to precedence rules.
 * 
 * Precedence Rules:
 * - Designation: CRM > MQL (always)
 * - Occupation Type: CRM > MQL (always)
 * - Employer: MQL > CRM (if MQL not empty)
 * - Location: MQL > CRM (if MQL not empty)
 * - Age: MQL > CRM (if MQL not empty)
 * - Gender: MQL > CRM (if MQL not empty)
 * - Locality Grade: MQL > CRM (if MQL not empty)
 * - Income: MQL > CRM (if MQL not empty)
 * - Budget: Complementary (use both sources)
 */
export function standardizeLead(
  crmData: CrmData | Record<string, any>,
  mqlData: MqlEnrichment | undefined
): StandardizedLead {
  const conflicts: DataConflict[] = [];
  
  // ============= Identity (CRM only) =============
  const name = (crmData?.['Opportunity Name'] as string) || '';
  const phone = (crmData?.['Mobile'] as string) || '';
  const email = (crmData?.['Email Id'] as string) || '';
  
  // ============= Demographics (MQL preferred) =============
  const ageResult = getMqlPreferred(mqlData?.age, undefined);
  const genderResult = getMqlPreferred(mqlData?.gender, undefined);
  
  // ============= Professional (Mixed precedence) =============
  
  // Designation: CRM > MQL (CRM always wins)
  const crmDesignation = crmData?.['Designation'] as string | undefined;
  const mqlDesignation = mqlData?.designation;
  const designationResult = getCrmPreferred(crmDesignation, mqlDesignation);
  
  const designationConflict = detectConflict(
    'designation',
    crmDesignation,
    mqlDesignation,
    'crm',
    'CRM preferred for designation'
  );
  if (designationConflict) conflicts.push(designationConflict);
  
  // Occupation Type: CRM > MQL (CRM always wins)
  const crmOccupation = crmData?.['Occupation'] as string | undefined;
  const occupationResult = getCrmPreferred(crmOccupation, undefined);
  
  // Employer: MQL > CRM (MQL wins if not empty)
  const crmCompany = crmData?.['Place of Work (Company Name)'] as string | undefined;
  const mqlEmployer = mqlData?.employerName;
  const employerResult = getMqlPreferred(mqlEmployer, crmCompany);
  
  const employerConflict = detectConflict(
    'employer',
    crmCompany,
    mqlEmployer,
    'mql',
    'MQL preferred for employer'
  );
  if (employerConflict) conflicts.push(employerConflict);
  
  // ============= Location (MQL preferred where available) =============
  
  // Location: MQL > CRM (MQL wins if not empty)
  const crmLocation = (crmData?.['Location of Residence'] as string) || (crmData?.['Current Residence'] as string);
  const mqlLocation = mqlData?.location;
  const locationResult = getMqlPreferred(mqlLocation, crmLocation);
  
  const locationConflict = detectConflict(
    'location',
    crmLocation,
    mqlLocation,
    'mql',
    'MQL preferred for location'
  );
  if (locationConflict) conflicts.push(locationConflict);
  
  // Locality Grade: MQL > CRM (MQL wins if not empty)
  const localityGradeResult = getMqlPreferred(mqlData?.localityGrade, undefined);
  
  // ============= Financial =============
  
  // Income: MQL > CRM (MQL wins if not empty)
  const incomeResult = getMqlPreferred(mqlData?.finalIncomeLacs, undefined);
  
  // Budget: Complementary (use both sources)
  const crmBudget = crmData?.['Budget'] as string | undefined;
  const budget = {
    crmStated: isEmpty(crmBudget) ? null : crmBudget!,
    mqlDerived: null as number | null, // MQL doesn't provide budget
    effective: isEmpty(crmBudget) ? null : crmBudget!,
  };
  
  // ============= Build DataSource Map =============
  const dataSource: DataSourceMap = {
    designation: designationResult.source,
    employer: employerResult.source,
    location: locationResult.source,
    age: ageResult.source,
    gender: genderResult.source,
    localityGrade: localityGradeResult.source,
    income: incomeResult.source,
    occupationType: occupationResult.source,
  };
  
  return {
    name,
    phone,
    email,
    age: ageResult.value,
    gender: genderResult.value,
    designation: designationResult.value,
    employer: employerResult.value,
    occupationType: occupationResult.value,
    location: locationResult.value,
    localityGrade: localityGradeResult.value,
    income: incomeResult.value,
    budget,
    dataSource,
    conflicts,
  };
}

/**
 * Creates a simplified version for LLM prompts (Edge Function compatible)
 * Returns a plain object without TypeScript-specific features
 */
export function standardizeLeadForLLM(
  crmData: Record<string, any>,
  mqlData: Record<string, any> | undefined
): {
  standardized: {
    name: string;
    phone: string;
    email: string;
    age: number | null;
    gender: string | null;
    designation: string | null;
    employer: string | null;
    occupationType: string | null;
    location: string | null;
    localityGrade: string | null;
    income: number | null;
    budgetStated: string | null;
  };
  dataSource: Record<string, string>;
  conflicts: Array<{
    field: string;
    crmValue: any;
    mqlValue: any;
    selectedSource: string;
    reason: string;
  }>;
} {
  const mqlEnrichment: MqlEnrichment | undefined = mqlData ? {
    age: mqlData.age,
    gender: mqlData.gender,
    designation: mqlData.designation,
    employerName: mqlData.employer_name || mqlData.employerName,
    location: mqlData.location,
    localityGrade: mqlData.locality_grade || mqlData.localityGrade,
    finalIncomeLacs: mqlData.final_income_lacs || mqlData.finalIncomeLacs,
    mqlRating: mqlData.mql_rating || mqlData.mqlRating,
    mqlCapability: mqlData.mql_capability || mqlData.mqlCapability,
    mqlLifestyle: mqlData.mql_lifestyle || mqlData.mqlLifestyle,
  } : undefined;
  
  const result = standardizeLead(crmData, mqlEnrichment);
  
  return {
    standardized: {
      name: result.name,
      phone: result.phone,
      email: result.email,
      age: result.age,
      gender: result.gender,
      designation: result.designation,
      employer: result.employer,
      occupationType: result.occupationType,
      location: result.location,
      localityGrade: result.localityGrade,
      income: result.income,
      budgetStated: result.budget.crmStated,
    },
    dataSource: {
      designation: result.dataSource.designation,
      employer: result.dataSource.employer,
      location: result.dataSource.location,
      age: result.dataSource.age,
      gender: result.dataSource.gender,
      localityGrade: result.dataSource.localityGrade,
      income: result.dataSource.income,
      occupationType: result.dataSource.occupationType,
    },
    conflicts: result.conflicts,
  };
}
