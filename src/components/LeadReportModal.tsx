import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lead } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Briefcase, MapPin, Home, DollarSign, Target, AlertCircle, MessageSquare, Users, Lightbulb, User, Building2, ArrowRightCircle } from 'lucide-react';

// Helper to convert snake_case to readable text
const formatSnakeCase = (text: string) => text.replace(/_/g, ' ');

// Helper to format budget in ₹ X.XX Cr format
const formatBudget = (value: number | string | null | undefined): string => {
  if (value == null || value === '' || value === 0) return 'No data available';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return 'No data available';
  
  // If value is already in crores format (< 100, like 1.3, 2.5)
  if (numValue < 100) {
    return `₹ ${numValue.toFixed(2)} Cr`;
  }
  
  // Convert raw amount to crores (e.g., 30000000 → 3.00 Cr)
  const croreValue = numValue / 10000000; // 1 Cr = 10,000,000
  return `₹ ${croreValue.toFixed(2)} Cr`;
};

// Helper to format in-hand funds as percentage
const formatInHandFunds = (
  value: number | string | null | undefined,
  budgetValue: number | string | null | undefined
): string => {
  if (value == null || value === '' || value === 0) return 'No data available';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return 'No data available';
  
  // Case 1: Decimal (0-1) - multiply by 100
  if (numValue > 0 && numValue < 1) {
    return `${Math.round(numValue * 100)}%`;
  }
  
  // Case 2: Already percentage (1-100)
  if (numValue >= 1 && numValue <= 100) {
    return `${Math.round(numValue)}%`;
  }
  
  // Case 3: Raw rupee amount (>100) - calculate percentage from budget
  if (numValue > 100 && budgetValue != null) {
    const budgetNum = typeof budgetValue === 'string' ? parseFloat(budgetValue) : budgetValue;
    if (!isNaN(budgetNum) && budgetNum > 0) {
      // Convert budget to same unit as in_hand_funds (rupees)
      const budgetInRupees = budgetNum < 100 ? budgetNum * 10000000 : budgetNum;
      const percentage = (numValue / budgetInRupees) * 100;
      if (percentage >= 0 && percentage <= 100) {
        return `${Math.round(percentage)}%`;
      }
    }
  }
  
  return 'No data available';
};

interface LeadReportModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadReportModal = ({ lead, open, onOpenChange }: LeadReportModalProps) => {
  if (!lead) return null;

  const analysis = lead.fullAnalysis;
  const mql = lead.mqlEnrichment;

  // Determine if MQL data is available and valid
  const mqlDataAvailable = mql?.mqlRating && mql.mqlRating !== 'N/A';

  // Get designation - prefer MQL if available
  const displayDesignation = (mqlDataAvailable && mql?.designation) ? mql.designation : lead.designation;

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'Hot': return 'bg-status-hot text-white';
      case 'Warm': return 'bg-status-warm text-white';
      case 'Cold': return 'bg-status-cold text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getMqlRatingColor = (rating?: string) => {
    switch (rating) {
      case 'P0': return 'bg-status-hot text-white';
      case 'P1': return 'bg-status-warm text-white';
      case 'P2': return 'bg-status-cold text-white';
      case 'N/A': return 'bg-gray-400 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getLocalityGradeColor = (grade?: string) => {
    switch (grade?.toLowerCase()) {
      case 'premium': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'popular': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'affordable': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCreditRatingColor = (rating?: string) => {
    switch (rating) {
      case 'High': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Low': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCapabilityColor = (capability?: string) => {
    switch (capability?.toLowerCase()) {
      case 'high': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'medium': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <DialogTitle className="sr-only">Lead Profile</DialogTitle>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold">{lead.name}</p>
              {analysis?.persona && (
                <Badge variant="outline" className="w-fit">
                  {analysis.persona}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <h2 className="text-2xl font-bold">Customer360</h2>
            <p className="text-xs text-muted-foreground">Powered by Raisn.ai</p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ratings Section - Restructured Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-start">
            {/* Left column: AI Rating + MQL Rating stacked */}
            <div className="space-y-3">
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1.5">AI Rating</p>
                <Badge className={`${getRatingColor(lead.rating)} min-w-[60px] justify-center`}>
                  {lead.rating || '-'}
                </Badge>
              </div>
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1.5">MQL Rating</p>
                <Badge className={`${getMqlRatingColor(mql?.mqlRating)} min-w-[60px] justify-center`}>
                  {mql?.mqlRating || 'N/A'}
                </Badge>
              </div>
            </div>
            
            {/* Middle column: Manager Rating + PPS Score stacked */}
            <div className="space-y-3">
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1.5">Manager Rating</p>
                <Badge className={`${getRatingColor(lead.managerRating)} min-w-[60px] justify-center`}>
                  {lead.managerRating || '-'}
                </Badge>
              </div>
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1.5">PPS Score</p>
                <span className="text-lg font-semibold">
                  {analysis?.pps_score !== undefined ? `${analysis.pps_score}/100` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Right column: Rating Rationale */}
            <div className="p-2.5 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1.5">Rating Rationale</p>
              <p className="text-sm">{analysis?.rating_rationale || 'N/A'}</p>
            </div>
          </div>

          <Separator />

          {/* Basic Details, Property Preferences & Persona - 3 Column Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Lead Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Lead Details</h3>
              
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.email}</span>
                </div>
              )}

              {/* MQL Age & Gender */}
              {mqlDataAvailable && (mql?.age || mql?.gender) && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {mql?.age ? `${mql.age} yrs` : ''}{mql?.age && mql?.gender ? ', ' : ''}{mql?.gender || ''}
                  </span>
                </div>
              )}

              {/* Designation - prefer MQL, show CRM only if different */}
              {displayDesignation && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{displayDesignation}</span>
                </div>
              )}

              {lead.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company}</span>
                </div>
              )}

              {lead.workLocation && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.workLocation}</span>
                </div>
              )}

              {lead.buildingName && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.buildingName}</span>
                </div>
              )}

              {/* Current Residence with Locality Badge inline */}
              {lead.currentResidence && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.currentResidence}</span>
                  {mqlDataAvailable && mql?.localityGrade && (
                    <Badge variant="outline" className={`${getLocalityGradeColor(mql.localityGrade)} text-xs`}>
                      {mql.localityGrade}
                    </Badge>
                  )}
                </div>
              )}

              {/* Show locality separately only if no current residence */}
              {!lead.currentResidence && mqlDataAvailable && mql?.localityGrade && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className={getLocalityGradeColor(mql.localityGrade)}>
                    {mql.localityGrade}
                  </Badge>
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

            {/* Buyer Persona */}
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Buyer Persona</h4>
                </div>
                {analysis?.persona ? (
                  <p className="text-sm font-semibold mb-2">{analysis.persona}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">N/A</p>
                )}
                {analysis?.persona_description && (
                  <p className="text-sm text-muted-foreground">{formatSnakeCase(analysis.persona_description)}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Profile */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Profile
              {mqlDataAvailable && mql?.mqlCapability && (
                <Badge variant="outline" className={getCapabilityColor(mql.mqlCapability)}>
                  {mql.mqlCapability}
                </Badge>
              )}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Budget</p>
                <p className="font-semibold">
                  {formatBudget(analysis?.extracted_signals?.budget_stated)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">In-Hand Funds</p>
                <p className="font-semibold">
                  {formatInHandFunds(analysis?.extracted_signals?.in_hand_funds, analysis?.extracted_signals?.budget_stated)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Funding Source</p>
                <p className="font-semibold">{lead.fundingSource || 'No data available'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* AI Analysis */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">AI Analysis</h3>

            {/* Summary, Concerns & Next Best Action - 3 Column Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  <h4 className="font-semibold text-sm">Summary</h4>
                </div>
                <p className="text-sm">{analysis?.summary || 'N/A'}</p>
              </div>

              {/* Key Concerns */}
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

              {/* Next Best Action */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm text-primary">Next Best Action</h4>
                </div>
                <p className="text-sm">{analysis?.next_best_action || 'N/A'}</p>
              </div>
            </div>

            {/* Talking Points with Topic Types */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4" />
                <h4 className="font-semibold text-sm">Talking Points</h4>
              </div>
              {analysis?.talking_points && analysis.talking_points.length > 0 ? (
                <ul className="space-y-3">
                  {analysis.talking_points.map((item, idx) => (
                    <li key={idx} className="text-sm flex flex-col gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                        item.type === 'Competitor handling' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : item.type === 'Objection handling'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {item.type}
                      </span>
                      <span className="leading-relaxed">{item.point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>

            {/* Cross-Sell Recommendation */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
