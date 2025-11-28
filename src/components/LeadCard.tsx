import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/lead';
import { Mail, Phone, Calendar, DollarSign, Clock } from 'lucide-react';

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

export const LeadCard = ({ lead }: LeadCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{lead.name}</CardTitle>
          {lead.rating && (
            <Badge className={getRatingColor(lead.rating)}>
              {lead.rating}
            </Badge>
          )}
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
        {lead.aiInsights && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">AI Insights</p>
            <p className="text-sm text-muted-foreground">{lead.aiInsights}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
