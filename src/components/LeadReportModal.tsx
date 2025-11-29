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
import { Mail, Phone, Briefcase, MapPin, Home, DollarSign, Calendar, Target, AlertCircle, MessageSquare, Users, CheckCircle2 } from 'lucide-react';

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
          <DialogTitle className="text-2xl">{lead.name}</DialogTitle>
          {analysis?.persona && (
            <Badge variant="outline" className="w-fit mt-2">
              {analysis.persona}
            </Badge>
          )}
          <DialogDescription>
            Complete lead analysis and details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ratings Section - 3 Column Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* AI Rating */}
            {lead.rating && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">AI Rating</p>
                <Badge className={getRatingColor(lead.rating)}>
                  {lead.rating}
                </Badge>
                {analysis?.rating_confidence && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {analysis.rating_confidence} confidence
                  </p>
                )}
              </div>
            )}
            
            {/* Manager Rating */}
            {lead.managerRating && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Manager Rating</p>
                <Badge className={getRatingColor(lead.managerRating)}>
                  {lead.managerRating}
                </Badge>
              </div>
            )}

            {/* Rating Rationale */}
            {analysis?.rating_rationale && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Rating Rationale</p>
                <p className="text-sm">{analysis.rating_rationale}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Basic Details & Persona */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact & Professional Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contact & Professional Details</h3>
              
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

              {lead.currentResidence && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.currentResidence}</span>
                </div>
              )}

              {lead.workLocation && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Work: {lead.workLocation}</span>
                </div>
              )}
            </div>

            {/* Persona & Property Interest */}
            <div className="space-y-4">
              {(analysis?.persona || analysis?.persona_description) && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Buyer Persona</h4>
                  </div>
                  {analysis.persona && (
                    <p className="text-sm font-semibold mb-2">{analysis.persona}</p>
                  )}
                  {analysis.persona_description && (
                    <p className="text-sm text-muted-foreground">{analysis.persona_description}</p>
                  )}
                </div>
              )}

              {(lead.carpetArea || lead.floorPreference || lead.facing) && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Property Preferences</h4>
                  <div className="space-y-1 text-sm">
                    {lead.carpetArea && <p>Area: {lead.carpetArea}</p>}
                    {lead.floorPreference && <p>Floor: {lead.floorPreference}</p>}
                    {lead.facing && <p>Facing: {lead.facing}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Financial Profile */}
          {(lead.budget || analysis?.extracted_signals?.budget_stated || analysis?.extracted_signals?.in_hand_funds) && (
            <>
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Profile
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {lead.budget && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Budget</p>
                      <p className="font-semibold">{lead.budget}</p>
                    </div>
                  )}
                  {analysis?.extracted_signals?.in_hand_funds && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">In-Hand Funds</p>
                      <p className="font-semibold">
                        ₹{(analysis.extracted_signals.in_hand_funds / 100000).toFixed(2)}L
                      </p>
                    </div>
                  )}
                  {lead.fundingSource && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Funding Source</p>
                      <p className="font-semibold">{lead.fundingSource}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* AI Analysis */}
          {analysis && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">AI Analysis</h3>

              {/* Summary */}
              {analysis.summary && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Summary</h4>
                  </div>
                  <p className="text-sm">{analysis.summary}</p>
                </div>
              )}

              {/* Next Best Action */}
              {analysis.next_best_action && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm text-primary">Next Best Action</h4>
                  </div>
                  <p className="text-sm">{analysis.next_best_action}</p>
                </div>
              )}

              {/* Key Concerns */}
              {analysis.key_concerns && analysis.key_concerns.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Key Concerns</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysis.key_concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Talking Points */}
              {analysis.talking_points && analysis.talking_points.length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4" />
                    <h4 className="font-semibold text-sm">Talking Points</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysis.talking_points.map((point, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Competitor Handling */}
              {analysis.competitor_handling && Object.keys(analysis.competitor_handling).length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Competitor Handling</h4>
                  <div className="space-y-3">
                    {Object.entries(analysis.competitor_handling).map(([competitor, strategy]) => (
                      <div key={competitor}>
                        <p className="text-sm font-medium">{competitor}:</p>
                        <p className="text-sm text-muted-foreground ml-4">{strategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Objection Rebuttals */}
              {analysis.objection_rebuttals && Object.keys(analysis.objection_rebuttals).length > 0 && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Objection Rebuttals</h4>
                  <div className="space-y-3">
                    {Object.entries(analysis.objection_rebuttals).map(([objection, rebuttal]) => (
                      <div key={objection}>
                        <p className="text-sm font-medium">{objection}:</p>
                        <p className="text-sm text-muted-foreground ml-4">{rebuttal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
