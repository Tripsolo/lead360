import { Lead } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Briefcase, Building2 } from 'lucide-react';
import {
  reconcileProfessionalData,
  calculateFinancialSummary,
} from '@/utils/mqlReconciliation';

interface MqlRawDataTabProps {
  lead: Lead;
}

// Helper to format MQL values for display
const formatMqlValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : 'None';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

// Section component for consistent styling
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h4 className="font-semibold text-sm text-foreground">{title}</h4>
    <div className="bg-muted/30 rounded-lg p-4">
      {children}
    </div>
  </div>
);

// Key-value row component
const DataRow = ({ label, value }: { label: string; value: unknown }) => (
  <div className="flex justify-between items-start py-1.5 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right max-w-[60%] break-words">
      {formatMqlValue(value)}
    </span>
  </div>
);

// Mini table for arrays
const ArrayTable = ({
  data,
  columns,
}: {
  data: Record<string, unknown>[] | undefined;
  columns: { key: string; label: string }[];
}) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-2 px-2 font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-border/50 last:border-0 even:bg-muted/20">
              {columns.map((col) => (
                <td key={col.key} className="py-2 px-2">
                  {formatMqlValue(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const MqlRawDataTab = ({ lead }: MqlRawDataTabProps) => {
  const rawResponse = lead.mqlEnrichment?.rawResponse as Record<string, unknown> | undefined;
  const enrichedAt = lead.mqlEnrichment?.enrichedAt;

  if (!rawResponse) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h4 className="text-lg font-semibold mb-2">No MQL Data Available</h4>
        <p className="text-sm text-muted-foreground max-w-md">
          This lead has not been enriched with MQL data yet. Click "Enrich with Data" to fetch MQL enrichment.
        </p>
      </div>
    );
  }

  const leads = rawResponse.leads as Record<string, unknown>[] | undefined;
  const leadData = leads?.[0] as Record<string, unknown> | undefined;

  if (!leadData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h4 className="text-lg font-semibold mb-2">Empty MQL Response</h4>
        <p className="text-sm text-muted-foreground">The MQL response does not contain lead data.</p>
      </div>
    );
  }

  const personInfo = leadData.person_info as Record<string, unknown> | undefined;
  const demography = leadData.demography as Record<string, unknown> | undefined;
  const income = leadData.income as Record<string, unknown> | undefined;
  const bankingSummary = leadData.banking_summary as Record<string, unknown> | undefined;
  const bankingLoans = leadData.banking_loans as Record<string, unknown>[] | undefined;
  const bankingCards = leadData.banking_cards as Record<string, unknown>[] | undefined;
  const businessDetails = leadData.business_details as Record<string, unknown>[] | undefined;
  const employmentDetails = leadData.employment_details as Record<string, unknown>[] | undefined;
  const linkedinDetails = leadData.linkedin_details as Record<string, unknown> | undefined;
  const creditScore = leadData.credit_score;
  const rtoDetails = leadData.rto_details as Record<string, unknown> | undefined;
  const rtoVehicles = (rtoDetails?.vehicles as Record<string, unknown>[]) || [];
  const rtoIncomeRange = rtoDetails?.income_range_rto as Record<string, unknown> | undefined;

  // Reconciled data
  const professional = reconcileProfessionalData(employmentDetails, linkedinDetails, businessDetails, demography);
  const financial = calculateFinancialSummary(creditScore, income, bankingSummary, bankingLoans, bankingCards);

  // Extract pincode from location
  const locationStr = (demography?.location as string) || '';
  const pincodeMatch = locationStr.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : 'N/A';
  const locationWithoutPincode = locationStr.replace(/\b\d{6}\b/, '').replace(/,\s*$/, '').trim() || 'N/A';

  // Badge color helper
  const getHighlightColor = (value: unknown): string => {
    const v = String(value || '').toLowerCase();
    if (['a', 'a+', 'high', 'premium', 'affluent'].some(k => v.includes(k))) return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    if (['b', 'medium', 'mid', 'moderate'].some(k => v.includes(k))) return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    if (['c', 'd', 'low'].some(k => v.includes(k))) return 'bg-red-500/15 text-red-700 border-red-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">

        {/* 1. Personal Info (factual) */}
        <Section title="Personal Info">
          <div className="grid grid-cols-2 gap-x-6">
            <DataRow label="Age" value={demography?.age} />
            <DataRow label="Gender" value={demography?.gender} />
            <DataRow label="Location" value={locationWithoutPincode} />
            <DataRow label="Pincode" value={pincode} />
          </div>
        </Section>

        <Separator />

        {/* 2. Professional Summary */}
        <Section title="Professional Summary">
          <div className="grid grid-cols-2 gap-x-6">
            <DataRow label="Current Role" value={professional.currentRole} />
            <DataRow label="Employment Type" value={professional.employmentType} />
            <DataRow label="Current Tenure" value={professional.currentTenure} />
            {professional.activeBusiness && (
              <DataRow label="Business" value={professional.activeBusiness} />
            )}
          </div>
          {professional.previousEmployers.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Previous Employers</p>
              {professional.previousEmployers.map((emp, idx) => (
                <DataRow key={idx} label={emp.name} value={emp.tenure} />
              ))}
            </div>
          )}
        </Section>

        <Separator />

        {/* 3. Financial Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">Financial Summary</h4>
            {financial.finalIncomeLacs != null && (
              <div className="text-right">
                <span className="text-sm font-medium text-muted-foreground mr-1.5">Income</span>
                <span className="text-lg font-bold text-foreground">{Math.round(financial.finalIncomeLacs)} <span className="text-xs font-normal text-muted-foreground">Lacs</span></span>
              </div>
            )}
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="Credit Score Range" value={financial.creditScoreRange} />
            <DataRow label="Total Active Loans" value={financial.totalActiveLoans} />
            <DataRow label="Active Home Loans" value={financial.activeHomeLoans} />
            <DataRow label="Closed Home Loans" value={financial.closedHomeLoans} />
            <DataRow label="Active Auto Loans" value={financial.activeAutoLoans} />
            <DataRow label="Active Credit Cards" value={financial.activeCreditCards} />
            <DataRow label="Total Home + Auto EMI" value={financial.totalHomeAutoEmi > 0 ? `₹${financial.totalHomeAutoEmi.toLocaleString()}` : 'N/A'} />
            <DataRow label="EMI to Monthly Income Ratio" value={financial.emiToIncomeRatio} />
          </div>
          </div>
        </div>

        <Separator />

        {/* 4. Vehicle Ownership */}
        <Section title="Vehicle Ownership">
          {rtoVehicles.length > 0 ? (
            <>
              <ArrayTable
                data={rtoVehicles}
                columns={[
                  { key: 'vehicle_maker', label: 'Maker' },
                  { key: 'vehicle_model', label: 'Model' },
                  { key: 'manufacture_year', label: 'Year' },
                  { key: 'registration_price', label: 'Price' },
                  { key: 'fuel_type', label: 'Fuel' },
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No vehicle data available</p>
          )}
        </Section>
      </div>
    </ScrollArea>
  );
};
