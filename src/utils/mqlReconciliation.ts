/**
 * Client-side reconciliation helpers for MQL raw data display.
 * Consolidates EPFO, LinkedIn, GST, and banking data into summary views.
 */

// --- Professional Summary ---

export interface ProfessionalProfile {
  currentRole: string; // "Designation at Employer"
  employmentType: string; // "Salaried" / "Self-Employed" / "N/A"
  currentTenure: string | null; // "Since Aug 2022 (3.5 years)"
  activeBusiness: string | null; // "Business Name - Industry - Turnover Slab"
  previousEmployers: { name: string; tenure: string }[];
}

function formatTenure(dateOfJoining: string | null | undefined): string | null {
  if (!dateOfJoining) return null;
  try {
    const joinDate = new Date(dateOfJoining);
    if (isNaN(joinDate.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - joinDate.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    const monthName = joinDate.toLocaleString('en-US', { month: 'short' });
    const yearStr = joinDate.getFullYear();
    return `Since ${monthName} ${yearStr} (${years.toFixed(1)} years)`;
  } catch {
    return null;
  }
}

function calcEmployerTenure(joining: string | null | undefined, exit: string | null | undefined): string {
  if (!joining) return 'N/A';
  try {
    const start = new Date(joining);
    const end = exit ? new Date(exit) : new Date();
    if (isNaN(start.getTime())) return 'N/A';
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return `${years.toFixed(1)} years`;
  } catch {
    return 'N/A';
  }
}

export function reconcileProfessionalData(
  employmentDetails: Record<string, unknown>[] | undefined,
  linkedinDetails: Record<string, unknown> | undefined,
  businessDetails: Record<string, unknown>[] | undefined,
  demography: Record<string, unknown> | undefined,
): ProfessionalProfile {
  // 1. Current employer from EPFO (no date_of_exit)
  const currentEmployment = employmentDetails?.find(
    (e) => !e.date_of_exit || e.date_of_exit === '' || e.date_of_exit === 'N/A',
  );
  const employerName = (currentEmployment?.employer_name as string) || 'Unknown';

  // 2. Designation from LinkedIn, fallback "Professional"
  const designation = (linkedinDetails?.current_designation as string) || 'Professional';

  // 3. Employment type from demography designation (e.g. "Salaried, Company")
  const demoDesignation = (demography?.designation as string) || '';
  let employmentType = 'N/A';
  const lower = demoDesignation.toLowerCase();
  if (lower.includes('salaried')) employmentType = 'Salaried';
  else if (lower.includes('self') || lower.includes('business')) employmentType = 'Self-Employed';
  else if (demoDesignation) employmentType = demoDesignation;

  // 4. Tenure from EPFO date_of_joining
  const currentTenure = formatTenure(currentEmployment?.date_of_joining as string | undefined);

  // 5. Business / GST status
  let activeBusiness: string | null = null;
  if (businessDetails && businessDetails.length > 0) {
    const activeGst = businessDetails.find(
      (b) => String(b.status || '').toLowerCase() === 'active',
    );
    if (activeGst) {
      const parts = [activeGst.business_name, activeGst.industry, activeGst.turnover_slab].filter(Boolean);
      activeBusiness = parts.join(' - ') || 'Active GST';
    } else {
      activeBusiness = 'Inactive GST';
    }
  }

  // 6. Previous employers (those with date_of_exit set)
  const previousEmployers = (employmentDetails || [])
    .filter((e) => e.date_of_exit && e.date_of_exit !== '' && e.date_of_exit !== 'N/A')
    .map((e) => ({
      name: (e.employer_name as string) || 'Unknown',
      tenure: calcEmployerTenure(e.date_of_joining as string | undefined, e.date_of_exit as string | undefined),
    }));

  return {
    currentRole: `${designation} at ${employerName}`,
    employmentType,
    currentTenure,
    activeBusiness,
    previousEmployers,
  };
}

// --- Financial Summary ---

export interface FinancialSummary {
  creditScoreRange: string;
  finalIncomeLacs: number | null;
  totalActiveLoans: number | null;
  activeHomeLoans: number;
  closedHomeLoans: number;
  activeAutoLoans: number;
  activeCreditCards: number;
  totalHomeAutoEmi: number;
  emiToIncomeRatio: string;
}

export function getCreditScoreRange(score: unknown): string {
  if (score === null || score === undefined) return 'N/A';
  const n = Number(score);
  if (isNaN(n)) return 'N/A';
  if (n < 600) return '<600';
  if (n < 700) return '600-700';
  if (n < 800) return '700-800';
  return '800+';
}

export function calculateFinancialSummary(
  creditScore: unknown,
  income: Record<string, unknown> | undefined,
  bankingSummary: Record<string, unknown> | undefined,
  bankingLoans: Record<string, unknown>[] | undefined,
  bankingCards: Record<string, unknown>[] | undefined,
): FinancialSummary {
  const isActiveLoan = (loan: Record<string, unknown>) => {
    if (loan.is_active === true) return true;
    if (loan.is_active === false) return false;
    return !loan.date_closed;
  };

  const activeLoans = (bankingLoans || []).filter(isActiveLoan);

  const homeKeywords = ['home', 'housing', 'property'];
  const autoKeywords = ['auto', 'vehicle'];
  const matchType = (loan: Record<string, unknown>, keywords: string[]) => {
    const t = String(loan.loan_type || '').toLowerCase();
    return keywords.some((k) => t.includes(k));
  };

  const activeHome = activeLoans.filter((l) => matchType(l, homeKeywords));
  const activeAuto = activeLoans.filter((l) => matchType(l, autoKeywords));

  const closedHomeLoans = (bankingLoans || []).filter((l) => {
    const closed = l.is_active === false || !!l.date_closed;
    return closed && matchType(l, homeKeywords);
  }).length;

  const emiSum = [...activeHome, ...activeAuto].reduce((sum, l) => {
    const amt = Number(l.installment_amount || l.emi_amount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const activeCards = (bankingCards || []).filter((c) => c.is_active === true);

  const finalIncome = income?.final_income_lacs != null ? Number(income.final_income_lacs) : null;
  const monthlyIncome = finalIncome != null ? (finalIncome * 100000) / 12 : null;
  let emiRatio = 'N/A';
  if (monthlyIncome && monthlyIncome > 0 && emiSum > 0) {
    emiRatio = `${((emiSum / monthlyIncome) * 100).toFixed(1)}%`;
  }

  return {
    creditScoreRange: getCreditScoreRange(creditScore),
    finalIncomeLacs: finalIncome,
    totalActiveLoans: bankingSummary?.active_loans != null ? Number(bankingSummary.active_loans) : null,
    activeHomeLoans: activeHome.length,
    closedHomeLoans,
    activeAutoLoans: activeAuto.length,
    activeCreditCards: activeCards.length,
    totalHomeAutoEmi: emiSum,
    emiToIncomeRatio: emiRatio,
  };
}
