import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Lead, MqlEnrichment } from '@/types/lead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Briefcase, MapPin, DollarSign, Target, AlertCircle, MessageSquare, Users, Lightbulb, Building2, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { standardizeLead } from '@/utils/leadStandardization';
import { MqlRawDataTab } from '@/components/MqlRawDataTab';
import raisnLogo from '@/assets/raisn-logo.png';

// Helper to convert snake_case to readable text
const formatSnakeCase = (text: string) => text.replace(/_/g, ' ');

// Helper to format budget
const formatBudget = (value: number | string | null | undefined): string => {
  if (value == null || value === '' || value === 0) return 'No data available';
  let numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return 'No data available';
  if (numValue >= 100) numValue = numValue / 10000000;
  if (numValue < 1) {
    const lacsValue = numValue * 100;
    return `₹ ${lacsValue.toFixed(1)} Lacs`;
  }
  return `₹ ${numValue.toFixed(2)} Cr`;
};

// Helper to format in-hand funds as percentage
const formatInHandFunds = (
  value: number | string | null | undefined,
  budgetValue: number | string | null | undefined
): string => {
  if (value == null || value === '' || value === 0) return 'No data available';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return 'No data available';
  if (numValue > 0 && numValue < 1) return `${Math.round(numValue * 100)}%`;
  if (numValue >= 1 && numValue <= 100) return `${Math.round(numValue)}%`;
  if (numValue > 100 && budgetValue != null) {
    const budgetNum = typeof budgetValue === 'string' ? parseFloat(budgetValue) : budgetValue;
    if (!isNaN(budgetNum) && budgetNum > 0) {
      const budgetInRupees = budgetNum < 100 ? budgetNum * 10000000 : budgetNum;
      const percentage = (numValue / budgetInRupees) * 100;
      if (percentage >= 0 && percentage <= 100) return `${Math.round(percentage)}%`;
    }
  }
  return 'No data available';
};

// Use shared utilities
import { getHighlightColor } from '@/utils/highlightColor';
import { PpsCircle } from '@/components/PpsCircle';

const getCapabilityColor = (capability?: string) => {
  switch (capability?.toLowerCase()) {
    case 'high': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'low': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
    default: return 'bg-muted text-muted-foreground';
  }
};

// PpsCircle imported from shared component

// Rating card (same style as MQL Highlights)
const RatingCard = ({ label, value, colorClass }: { label: string; value: string; colorClass: string }) => (
  <div className={`rounded-lg border px-3 py-2 text-center min-w-[80px] ${colorClass}`}>
    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const LeadProfile = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>((location.state as any)?.lead || null);
  const [loading, setLoading] = useState(!lead);

  // Fetch from DB if no state passed (direct URL access)
  useEffect(() => {
    if (lead || !leadId) return;
    const fetchLead = async () => {
      setLoading(true);
      try {
        const { data: leadRow } = await supabase
          .from('leads')
          .select('*')
          .eq('lead_id', leadId)
          .limit(1)
          .maybeSingle();
        if (!leadRow) { setLoading(false); return; }

        const { data: analysisRow } = await supabase
          .from('lead_analyses')
          .select('*')
          .eq('lead_id', leadId)
          .limit(1)
          .maybeSingle();

        const { data: enrichmentRow } = await supabase
          .from('lead_enrichments')
          .select('*')
          .eq('lead_id', leadId)
          .limit(1)
          .maybeSingle();

        const crmData = leadRow.crm_data as Record<string, unknown>;
        let mqlEnrichment: MqlEnrichment | undefined;
        if (enrichmentRow) {
          mqlEnrichment = {
            mqlRating: enrichmentRow.mql_rating || undefined,
            mqlCapability: enrichmentRow.mql_capability || undefined,
            mqlLifestyle: enrichmentRow.mql_lifestyle || undefined,
            creditScore: enrichmentRow.credit_score || undefined,
            age: enrichmentRow.age || undefined,
            gender: enrichmentRow.gender || undefined,
            location: enrichmentRow.location || undefined,
            localityGrade: enrichmentRow.locality_grade || undefined,
            lifestyle: enrichmentRow.lifestyle || undefined,
            finalIncomeLacs: enrichmentRow.final_income_lacs ? Number(enrichmentRow.final_income_lacs) : undefined,
            employerName: enrichmentRow.employer_name || undefined,
            designation: enrichmentRow.designation || undefined,
            totalLoans: enrichmentRow.total_loans || undefined,
            activeLoans: enrichmentRow.active_loans || undefined,
            homeLoans: enrichmentRow.home_loans || undefined,
            autoLoans: enrichmentRow.auto_loans || undefined,
            highestCardUsagePercent: enrichmentRow.highest_card_usage_percent ? Number(enrichmentRow.highest_card_usage_percent) : undefined,
            isAmexHolder: enrichmentRow.is_amex_holder || undefined,
            enrichedAt: enrichmentRow.enriched_at || undefined,
            rawResponse: enrichmentRow.raw_response as Record<string, any> || undefined,
          };
        }

        setLead({
          id: leadRow.lead_id,
          name: (crmData?.['Opportunity Name'] as string) || 'Unknown',
          phone: (crmData?.['Mobile'] as string) || '',
          email: (crmData?.['Email Id'] as string) || '',
          projectInterest: (crmData?.['Project'] as string) || undefined,
          leadOwner: (crmData?.['Name of Closing Manager'] as string) || undefined,
          managerRating: (crmData?.['Walkin Manual Rating'] as string) as Lead['managerRating'],
          occupation: (crmData?.['Occupation'] as string) || undefined,
          company: (crmData?.['Place of Work (Company Name)'] as string) || undefined,
          buildingName: (crmData?.['Building Name'] as string) || undefined,
          currentResidence: (crmData?.['Location of Residence'] as string) || undefined,
          workLocation: (crmData?.['Location of Work'] as string) || undefined,
          designation: (crmData?.['Designation'] as string) || undefined,
          carpetArea: (crmData?.['Desired Carpet Area (Post-Walkin)'] as string) || undefined,
          floorPreference: (crmData?.['Desired Floor Band'] as string) || undefined,
          facing: (crmData?.['Desired Facing'] as string) || undefined,
          fundingSource: (crmData?.['Source of Funding'] as string) || undefined,
          rawData: crmData as Record<string, any>,
          rating: analysisRow?.rating as Lead['rating'],
          aiInsights: analysisRow?.insights || undefined,
          fullAnalysis: analysisRow?.full_analysis as Lead['fullAnalysis'],
          mqlEnrichment,
        });
      } catch (err) {
        console.error('Error fetching lead:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [leadId, lead]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  const analysis = lead.fullAnalysis;
  const mql = lead.mqlEnrichment;
  const standardized = standardizeLead(lead.rawData || {}, mql);
  const mqlDataAvailable = mql?.mqlRating && mql.mqlRating !== 'N/A';

  // Rating rationale as bullet points
  const rationalePoints = (analysis?.rating_rationale || '')
    .split(/(?<=\.)\s+/)
    .filter(s => s.trim().length > 0);

  // Persona description as bullet points
  const personaPoints = (analysis?.persona_description || '')
    .split(/(?<=\.)\s+/)
    .filter(s => s.trim().length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Branded navbar with back button */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={raisnLogo} alt="Raisn" className="h-8" />
            <span className="text-lg font-semibold text-foreground">Customer360</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Lead name + ratings header (always visible) */}
        <div className="mb-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold">{lead.name}</h1>
            <div className="flex items-center gap-3 shrink-0">
              <RatingCard label="Manager" value={lead.managerRating || '-'} colorClass={getHighlightColor(lead.managerRating)} />
              <RatingCard label="MQL" value={mql?.mqlRating || 'N/A'} colorClass={getHighlightColor(mql?.mqlRating)} />
              <RatingCard label="AI Rating" value={lead.rating || '-'} colorClass={getHighlightColor(lead.rating)} />
              {analysis?.pps_score !== undefined ? (
                <div className="flex flex-col items-center min-w-[48px]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">PPS</p>
                  <PpsCircle score={analysis.pps_score} />
                </div>
              ) : (
                <RatingCard label="PPS" value="N/A" colorClass="bg-muted text-muted-foreground border-border" />
              )}
            </div>
          </div>
          
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mql-raw">MQL Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Rationale + Buyer Persona row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Rating Rationale */}
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Rating Rationale</h4>
                </div>
                {rationalePoints.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {rationalePoints.map((point, idx) => (
                      <li key={idx} className="text-sm leading-snug">{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>

              {/* Buyer Persona */}
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Buyer Persona</h4>
                  </div>
                  <Badge variant="outline">{analysis?.persona || 'N/A'}</Badge>
                </div>
                {personaPoints.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {personaPoints.map((point, idx) => (
                      <li key={idx} className="text-sm leading-snug">{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Lead Details, Property Preferences & Financial Profile */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Lead Details</h3>
                {standardized.designation && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Designation: </span>
                    <span>{standardized.designation}</span>
                  </div>
                )}
                {standardized.employer && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Employer: </span>
                    <span>{standardized.employer}</span>
                  </div>
                )}
                {lead.workLocation && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Work Location: </span>
                    <span>{lead.workLocation}</span>
                  </div>
                )}
                {lead.buildingName && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Building: </span>
                    <span>{lead.buildingName}</span>
                  </div>
                )}
                {standardized.location && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Residence: </span>
                    <span>{standardized.location}</span>
                  </div>
                )}
              </div>

              {/* Property Preferences */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Property Preferences</h3>
                {lead.carpetArea && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Area: </span>
                    <span>{lead.carpetArea}</span>
                  </div>
                )}
                {lead.floorPreference && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Floor: </span>
                    <span>{lead.floorPreference}</span>
                  </div>
                )}
                {lead.facing && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Facing: </span>
                    <span>{lead.facing}</span>
                  </div>
                )}
              </div>

              {/* Financial Profile */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Financial Profile</h3>
                <div className="text-sm">
                  <span className="text-muted-foreground">Budget: </span>
                  <span>{formatBudget(analysis?.extracted_signals?.budget_stated)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">In-Hand Funds: </span>
                  <span>{formatInHandFunds(analysis?.extracted_signals?.in_hand_funds, analysis?.extracted_signals?.budget_stated)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Funding Source: </span>
                  <span>{lead.fundingSource || 'No data available'}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* AI Analysis */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">AI Analysis</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Summary</h4>
                  </div>
                  <p className="text-sm">{analysis?.summary || 'N/A'}</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Key Concerns</h4>
                  </div>
                  {analysis?.key_concerns && analysis.key_concerns.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.key_concerns.map((concern, idx) => (
                        <li key={idx} className="text-sm flex flex-col gap-1">
                          {analysis.concern_categories?.[idx] && (
                            <Badge variant="outline" className="w-fit text-xs">
                              {analysis.concern_categories[idx]}
                            </Badge>
                          )}
                          <span>{concern}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">N/A</p>
                  )}
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-primary">Next Best Action</h4>
                    {typeof analysis?.next_best_action === 'object' && analysis.next_best_action?.action_type && (
                      <Badge variant="outline" className="text-xs">
                        {analysis.next_best_action.action_type}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">
                    {typeof analysis?.next_best_action === 'string'
                      ? analysis.next_best_action
                      : analysis?.next_best_action?.action || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Talking Points */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4" />
                  <h4 className="font-semibold text-sm">Talking Points</h4>
                </div>
                {analysis?.talking_points && analysis.talking_points.length > 0 ? (
                  <ul className="space-y-3">
                    {analysis.talking_points.map((item, idx) => (
                      <li key={idx} className="text-sm flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                            item.type === 'Competitor handling'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                              : item.type === 'Objection handling'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="leading-relaxed">{item.point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">N/A</p>
                )}
              </div>

              {/* Cross-Sell */}
              {analysis?.cross_sell_recommendation && analysis.cross_sell_recommendation.recommended_project && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Cross-Sell Opportunity</h4>
                    <Badge className="bg-blue-600 text-white ml-auto">
                      {analysis.cross_sell_recommendation.recommended_project}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <span className="font-medium">Reason: </span>
                    {analysis.cross_sell_recommendation.reason}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                    💡 "{analysis.cross_sell_recommendation.talking_point}"
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mql-raw">
            <MqlRawDataTab lead={lead} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeadProfile;
