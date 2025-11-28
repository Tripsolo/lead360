import { Lead } from '@/types/lead';
import { LeadCard } from './LeadCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeadsListProps {
  leads: Lead[];
}

export const LeadsList = ({ leads }: LeadsListProps) => {
  const hotLeads = leads.filter(l => l.rating === 'Hot');
  const warmLeads = leads.filter(l => l.rating === 'Warm');
  const coldLeads = leads.filter(l => l.rating === 'Cold');
  const unratedLeads = leads.filter(l => !l.rating);

  return (
    <div className="w-full">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
          <TabsTrigger value="hot">Hot ({hotLeads.length})</TabsTrigger>
          <TabsTrigger value="warm">Warm ({warmLeads.length})</TabsTrigger>
          <TabsTrigger value="cold">Cold ({coldLeads.length})</TabsTrigger>
          <TabsTrigger value="unrated">Unrated ({unratedLeads.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </TabsContent>
        
        <TabsContent value="hot" className="space-y-4">
          {hotLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </TabsContent>
        
        <TabsContent value="warm" className="space-y-4">
          {warmLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </TabsContent>
        
        <TabsContent value="cold" className="space-y-4">
          {coldLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </TabsContent>
        
        <TabsContent value="unrated" className="space-y-4">
          {unratedLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
