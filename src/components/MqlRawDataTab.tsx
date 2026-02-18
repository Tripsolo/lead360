import { Lead } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database } from 'lucide-react';

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
  columns 
}: { 
  data: Record<string, unknown>[] | undefined; 
  columns: { key: string; label: string }[] 
}) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th key={col.key} className="text-left py-2 px-2 font-medium text-muted-foreground">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-border/50 last:border-0 even:bg-muted/20">
              {columns.map(col => (
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

  // Check if we have MQL data
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

  // Extract the lead data from response structure
  const leads = rawResponse.leads as Record<string, unknown>[] | undefined;
  const leadData = leads?.[0] as Record<string, unknown> | undefined;

  if (!leadData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h4 className="text-lg font-semibold mb-2">Empty MQL Response</h4>
        <p className="text-sm text-muted-foreground">
          The MQL response does not contain lead data.
        </p>
      </div>
    );
  }

  const personInfo = leadData.person_info as Record<string, unknown> | undefined;
  const demography = leadData.demography as Record<string, unknown> | undefined;
  const income = leadData.income as Record<string, unknown> | undefined;
  const bankingSummary = leadData.banking_summary as Record<string, unknown> | undefined;
  const bankingLoans = leadData.banking_loans as Record<string, unknown>[] | undefined;
  const bankingCards = leadData.banking_cards as Record<string, unknown>[] | undefined;
  const businessDetails = leadData.business_details as Record<string, unknown> | undefined;
  const employmentDetails = leadData.employment_details as Record<string, unknown>[] | undefined;
  const linkedinDetails = leadData.linkedin_details as Record<string, unknown> | undefined;
  const creditScore = leadData.credit_score;
  const rtoDetails = leadData.rto_details as Record<string, unknown> | undefined;
  const rtoVehicles = (rtoDetails?.vehicles as Record<string, unknown>[]) || [];
  const rtoIncomeRange = rtoDetails?.income_range_rto as Record<string, unknown> | undefined;

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Enrichment Timestamp */}
        {enrichedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Enriched at:</span>
            <Badge variant="outline">{new Date(enrichedAt).toLocaleString()}</Badge>
          </div>
        )}

        {/* Person Info */}
        <Section title="Person Info">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="MQL Rating" value={personInfo?.rating} />
            <DataRow label="Age" value={demography?.age} />
            <DataRow label="Gender" value={demography?.gender} />
            <DataRow label="Locality Grade" value={personInfo?.locality_grade} />
            <DataRow label="Lifestyle" value={personInfo?.lifestyle} />
            <DataRow label="Capability" value={personInfo?.capability} />
          </div>
        </Section>

        <Separator />

        {/* Credit Score */}
        <Section title="Credit Score">
          <DataRow label="Score" value={creditScore} />
        </Section>

        <Separator />

        {/* Income */}
        <Section title="Income">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="Final Income (Lacs)" value={income?.final_income_lacs} />
            <DataRow label="Pre-Tax Income (Lacs)" value={income?.pre_tax_income_lacs} />
          </div>
        </Section>

        <Separator />

        {/* Demography */}
        <Section title="Demography">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="Location" value={demography?.location} />
            <DataRow label="Designation" value={demography?.designation} />
            <DataRow label="City" value={demography?.city} />
            <DataRow label="State" value={demography?.state} />
            <DataRow label="Pincode" value={demography?.pincode} />
          </div>
        </Section>

        <Separator />

        {/* Banking Summary */}
        <Section title="Banking Summary">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="Total Loans" value={bankingSummary?.total_loans} />
            <DataRow label="Active Loans" value={bankingSummary?.active_loans} />
            <DataRow label="Home Loans" value={bankingSummary?.home_loans} />
            <DataRow label="Auto Loans" value={bankingSummary?.auto_loans} />
            <DataRow label="Consumer Loans" value={bankingSummary?.consumer_loan_count} />
            <DataRow label="Credit Card Count" value={bankingSummary?.credit_card_count} />
            <DataRow label="Has Premium Cards" value={bankingSummary?.has_premium_cards} />
            <DataRow label="Is Amex Holder" value={bankingSummary?.is_amex_holder} />
            <DataRow label="Highest Card Usage %" value={bankingSummary?.highest_card_usage_percent} />
            <DataRow label="Active EMI Burden" value={bankingSummary?.active_emi_burden} />
            <DataRow label="EMI to Income Ratio" value={bankingSummary?.emi_to_income_ratio} />
          </div>
        </Section>

        <Separator />

        {/* Banking Loans */}
        <Section title="Banking Loans">
          <ArrayTable
            data={bankingLoans}
            columns={[
              { key: 'loan_type', label: 'Type' },
              { key: 'sanction_date', label: 'Sanction Date' },
              { key: 'sanction_amount', label: 'Amount' },
              { key: 'emi_amount', label: 'EMI' },
              { key: 'current_balance', label: 'Balance' },
              { key: 'status', label: 'Status' },
            ]}
          />
        </Section>

        <Separator />

        {/* Banking Cards */}
        <Section title="Banking Cards">
          <ArrayTable
            data={bankingCards}
            columns={[
              { key: 'card_type', label: 'Type' },
              { key: 'card_name', label: 'Name' },
              { key: 'credit_limit', label: 'Limit' },
              { key: 'usage_percent', label: 'Usage %' },
              { key: 'is_premium', label: 'Premium' },
            ]}
          />
        </Section>

        <Separator />

        {/* Business Details */}
        <Section title="Business Details">
          <div className="grid md:grid-cols-2 gap-x-6">
            <DataRow label="GST Number" value={businessDetails?.gst_number} />
            <DataRow label="Business Name" value={businessDetails?.business_name} />
            <DataRow label="Business Type" value={businessDetails?.business_type} />
            <DataRow label="Industry" value={businessDetails?.industry} />
            <DataRow label="Turnover Slab" value={businessDetails?.turnover_slab} />
          </div>
        </Section>

        <Separator />

        {/* Employment Details */}
        <Section title="Employment Details">
          <ArrayTable
            data={employmentDetails}
            columns={[
              { key: 'employer_name', label: 'Employer' },
              { key: 'designation', label: 'Designation' },
              { key: 'start_date', label: 'Start Date' },
              { key: 'end_date', label: 'End Date' },
              { key: 'is_current', label: 'Current' },
            ]}
          />
        </Section>

        <Separator />

        {/* RTO / Vehicle Ownership */}
        <Section title="RTO / Vehicle Ownership">
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
              { key: 'lifestyle', label: 'Lifestyle' },
                ]}
              />
              {rtoIncomeRange && (
                <div className="mt-3 grid md:grid-cols-2 gap-x-6">
                  <DataRow label="Vehicle Value" value={rtoIncomeRange?.vehicle_value} />
                  <DataRow label="RTO Pre-Tax Income" value={rtoDetails?.pre_tax_income_rto} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No vehicle data available</p>
          )}
        </Section>

        <Separator />

        {/* LinkedIn Details */}
        <Section title="LinkedIn Details">
          {linkedinDetails && Object.keys(linkedinDetails).length > 0 ? (
            <div className="grid md:grid-cols-2 gap-x-6">
              <DataRow label="Profile URL" value={linkedinDetails?.profile_url} />
              <DataRow label="Total Experience (Years)" value={linkedinDetails?.total_years_experience} />
              <DataRow label="Current Designation" value={linkedinDetails?.current_designation} />
              <DataRow label="Current Employer" value={linkedinDetails?.current_employer} />
              <DataRow label="Highest Education" value={linkedinDetails?.highest_education} />
              <DataRow label="Job Stable" value={linkedinDetails?.job_stable} />
              <DataRow label="Network Score" value={linkedinDetails?.network_score} />
              <DataRow label="Connection Count" value={linkedinDetails?.connection_count} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No LinkedIn data available</p>
          )}
        </Section>
      </div>
    </ScrollArea>
  );
};
