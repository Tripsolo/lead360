import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lead } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Briefcase, MapPin, Home, DollarSign, Calendar, Target, AlertCircle, MessageSquare, Users, CheckCircle2, Lightbulb } from 'lucide-react';

interface LeadReportModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadReportModal = ({ lead, open, onOpenChange }: LeadReportModalProps) => {
  if (!lead) return null;

  const analysis = lead.fullAnalysis;

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'Hot': return 'bg-status-hot text-white';
      case 'Warm': return 'bg-status-warm text-white';
      case 'Cold': return 'bg-status-cold text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Customer 360</DialogTitle>
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold">{lead.name}</p>
            {analysis?.persona && (
              <Badge variant="outline" className="w-fit">
                {analysis.persona}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ratings Section - Compact 3 Column Grid */}
          <div className="grid grid-cols-[auto_auto_1fr] gap-3 items-start">
            {/* AI Rating */}
            {lead.rating && (
              <div className="p-2.5 bg-muted/30 rounded-lg min-w-[140px]">
                <p className="text-sm text-muted-foreground mb-1.5">AI Rating</p>
                <Badge className={getRatingColor(lead.rating)}>
                  {lead.rating}
                </Badge>
                {analysis?.rating_confidence && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {analysis.rating_confidence} confidence
                  </p>
                )}
              </div>
            )}
            
            {/* Manager Rating */}
            {lead.managerRating && (
              <div className="p-2.5 bg-muted/30 rounded-lg min-w-[140px]">
                <p className="text-sm text-muted-foreground mb-1.5">Manager Rating</p>
                <Badge className={getRatingColor(lead.managerRating)}>
                  {lead.managerRating}
                </Badge>
              </div>
            )}

            {/* Rating Rationale - Takes remaining space */}
            {analysis?.rating_rationale && (
              <div className="p-2.5 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1.5">Rating Rationale</p>
                <p className="text-sm">{analysis.rating_rationale}</p>
              </div>
            )}
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

              {lead.occupation && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.occupation}</span>
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
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Work: {lead.workLocation}</span>
                </div>
              )}

              {lead.buildingName && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.buildingName}</span>
                </div>
              )}

              {lead.currentResidence && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.currentResidence}</span>
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
                  <p className="text-sm text-muted-foreground">{analysis.persona_description}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Profile */}
          <>
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Profile
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Budget</p>
                  <p className="font-semibold">{lead.budget || 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">In-Hand Funds</p>
                  <p className="font-semibold">
                    {analysis?.extracted_signals?.in_hand_funds 
                      ? `₹${(analysis.extracted_signals.in_hand_funds / 100000).toFixed(2)}L`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Funding Source</p>
                  <p className="font-semibold">{lead.fundingSource || 'N/A'}</p>
                </div>
              </div>
            </div>
            <Separator />
          </>

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
