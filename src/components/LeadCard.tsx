import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/lead';
import { Mail, Phone, Calendar, DollarSign, Clock, TrendingUp, Target, MessageSquare, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
}

const getRatingColor = (rating?: string) => {
  switch (rating) {
    case 'Hot':
      return 'bg-status-hot text-white';
    case 'Warm':
      return 'bg-status-warm text-white';
    case 'Cold':
      return 'bg-status-cold text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getConfidenceColor = (confidence?: string) => {
  switch (confidence) {
    case 'High':
      return 'text-green-600';
    case 'Medium':
      return 'text-yellow-600';
    case 'Low':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

export const LeadCard = ({ lead }: LeadCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const analysis = lead.fullAnalysis;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{lead.name}</CardTitle>
            {analysis?.persona && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {analysis.persona}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {lead.rating && (
              <Badge className={getRatingColor(lead.rating)}>
                {lead.rating}
              </Badge>
            )}
            {analysis?.rating_confidence && (
              <span className={`text-xs font-medium ${getConfidenceColor(analysis.rating_confidence)}`}>
                {analysis.rating_confidence} Confidence
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {lead.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.projectInterest && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{lead.projectInterest}</span>
          </div>
        )}
        {lead.budget && (
          <div className="text-sm">
            <span className="font-medium">Budget: </span>
            <span className="text-muted-foreground">{lead.budget}</span>
          </div>
        )}
        {lead.timeline && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{lead.timeline}</span>
          </div>
        )}
        {lead.date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(lead.date).toLocaleDateString()}</span>
          </div>
        )}

        {analysis?.summary && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Summary
            </p>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>
        )}

        {analysis?.rating_rationale && (
          <div className="p-3 bg-muted/30 rounded-md">
            <p className="text-sm font-medium mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rating Rationale
            </p>
            <p className="text-sm text-muted-foreground">{analysis.rating_rationale}</p>
          </div>
        )}

        {analysis && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full mt-4" size="sm">
                {isOpen ? 'Hide' : 'Show'} Detailed Analysis
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {analysis.next_best_action && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
                    <Target className="h-4 w-4" />
                    Next Best Action
                  </p>
                  <p className="text-sm">{analysis.next_best_action}</p>
                </div>
              )}

              {analysis.key_concerns && analysis.key_concerns.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Key Concerns
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.key_concerns.map((concern, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.talking_points && analysis.talking_points.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Talking Points
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.talking_points.map((point, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.competitor_handling && Object.keys(analysis.competitor_handling).length > 0 && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm font-semibold mb-2">Competitor Handling</p>
                  {Object.entries(analysis.competitor_handling).map(([competitor, strategy]) => (
                    <div key={competitor} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium">{competitor}:</p>
                      <p className="text-sm text-muted-foreground ml-4">{strategy}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.objection_rebuttals && Object.keys(analysis.objection_rebuttals).length > 0 && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm font-semibold mb-2">Objection Rebuttals</p>
                  {Object.entries(analysis.objection_rebuttals).map(([objection, rebuttal]) => (
                    <div key={objection} className="mb-2 last:mb-0">
                      <p className="text-sm font-medium">{objection}:</p>
                      <p className="text-sm text-muted-foreground ml-4">{rebuttal}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.extracted_signals && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm font-semibold mb-2">Extracted Signals</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {analysis.extracted_signals.budget_stated && (
                      <div>
                        <span className="font-medium">Budget:</span> ₹{(analysis.extracted_signals.budget_stated / 10000000).toFixed(2)}Cr
                      </div>
                    )}
                    {analysis.extracted_signals.in_hand_funds && (
                      <div>
                        <span className="font-medium">In-hand:</span> ₹{(analysis.extracted_signals.in_hand_funds / 100000).toFixed(2)}L
                      </div>
                    )}
                    {analysis.extracted_signals.finalization_timeline && (
                      <div>
                        <span className="font-medium">Timeline:</span> {analysis.extracted_signals.finalization_timeline}
                      </div>
                    )}
                    {analysis.extracted_signals.decision_maker_present !== undefined && (
                      <div>
                        <span className="font-medium">Decision Maker:</span> {analysis.extracted_signals.decision_maker_present ? 'Yes' : 'No'}
                      </div>
                    )}
                    {analysis.extracted_signals.spot_closure_asked !== undefined && (
                      <div>
                        <span className="font-medium">Spot Closure:</span> {analysis.extracted_signals.spot_closure_asked ? 'Yes' : 'No'}
                      </div>
                    )}
                    {analysis.extracted_signals.sample_feedback && (
                      <div>
                        <span className="font-medium">Sample Feedback:</span> {analysis.extracted_signals.sample_feedback}
                      </div>
                    )}
                  </div>
                  {analysis.extracted_signals.core_motivation && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="font-medium text-xs">Core Motivation:</span>
                      <p className="text-xs text-muted-foreground mt-1">{analysis.extracted_signals.core_motivation}</p>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {!analysis && lead.aiInsights && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">AI Insights</p>
            <p className="text-sm text-muted-foreground">{lead.aiInsights}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};