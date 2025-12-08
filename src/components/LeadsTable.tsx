import { useState } from 'react';
import { Lead } from '@/types/lead';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  ratingFilter: string | null;
  onExport: () => void;
}

type SortField = 'name' | 'date' | 'rating' | 'phone' | 'mqlRating' | 'ppsScore';
type SortDirection = 'asc' | 'desc' | null;

export const LeadsTable = ({ leads, onLeadClick, ratingFilter, onExport }: LeadsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Get unique lead owners and projects
  const leadOwners = Array.from(new Set(leads.map(l => l.leadOwner).filter(Boolean)));
  const projects = Array.from(new Set(leads.map(l => l.projectInterest).filter(Boolean)));

  // Filter leads
  let filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      String(lead.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(lead.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(lead.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = !ratingFilter || lead.rating === ratingFilter;
    const matchesOwner = ownerFilter === 'all' || lead.leadOwner === ownerFilter;
    const matchesProject = projectFilter === 'all' || lead.projectInterest === projectFilter;

    return matchesSearch && matchesRating && matchesOwner && matchesProject;
  });

  // Sort leads
  if (sortField && sortDirection) {
    filteredLeads = [...filteredLeads].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'mqlRating') {
        const mqlOrder: Record<string, number> = { 'P0': 6, 'P1': 5, 'P2': 4, 'P3': 3, 'P4': 2, 'P5': 1 };
        aVal = mqlOrder[a.mqlEnrichment?.mqlRating || ''] || 0;
        bVal = mqlOrder[b.mqlEnrichment?.mqlRating || ''] || 0;
      } else if (sortField === 'ppsScore') {
        aVal = a.fullAnalysis?.pps_score || 0;
        bVal = b.fullAnalysis?.pps_score || 0;
      } else {
        aVal = a[sortField as keyof Lead];
        bVal = b[sortField as keyof Lead];
      }

      if (sortField === 'date') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (sortField === 'rating') {
        const ratingOrder: Record<string, number> = { 'hot': 3, 'warm': 2, 'cold': 1 };
        aVal = ratingOrder[String(aVal || '').toLowerCase()] || 0;
        bVal = ratingOrder[String(bVal || '').toLowerCase()] || 0;
      } else if (sortField !== 'mqlRating') {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  const getRatingColor = (rating?: string) => {
    const normalizedRating = rating?.toLowerCase();
    switch (normalizedRating) {
      case 'hot': return 'bg-status-hot text-white';
      case 'warm': return 'bg-status-warm text-white';
      case 'cold': return 'bg-status-cold text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const formatRating = (rating?: string) => {
    if (!rating) return '-';
    return rating.charAt(0).toUpperCase() + rating.slice(1).toLowerCase();
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Lead ID, Phone, or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full md:flex-1">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project} value={project!}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-full md:flex-1">
            <SelectValue placeholder="Lead Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {leadOwners.map(owner => (
              <SelectItem key={owner} value={owner!}>
                {owner}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onExport} size="sm" className="md:w-auto">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('name')} className="h-8 px-2">
                  Lead Name
                  <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Lead ID</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('phone')} className="h-8 px-2">
                  Phone
                  <SortIcon field="phone" />
                </Button>
              </TableHead>
              <TableHead>Lead Owner</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('date')} className="h-8 px-2">
                  Last Visit
                  <SortIcon field="date" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('rating')} className="h-8 px-2">
                  AI Rating
                  <SortIcon field="rating" />
                </Button>
              </TableHead>
              <TableHead>Manager Rating</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('mqlRating')} className="h-8 px-2">
                  MQL Rating
                  <SortIcon field="mqlRating" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('ppsScore')} className="h-8 px-2">
                  PPS Score
                  <SortIcon field="ppsScore" />
                </Button>
              </TableHead>
              <TableHead>Key Concern</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No leads found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onLeadClick(lead)}
                >
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.projectInterest || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{lead.id}</TableCell>
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>{lead.leadOwner || '-'}</TableCell>
                  <TableCell>
                    {lead.date ? new Date(lead.date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {lead.rating ? (
                      <Badge className={`${getRatingColor(lead.rating)} min-w-[60px] justify-center`}>
                        {formatRating(lead.rating)}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-400 text-white min-w-[60px] justify-center">-</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.managerRating ? (
                      <Badge className={`${getRatingColor(lead.managerRating)} min-w-[60px] justify-center`}>
                        {formatRating(lead.managerRating)}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-400 text-white min-w-[60px] justify-center">-</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getMqlRatingColor(lead.mqlEnrichment?.mqlRating)} min-w-[60px] justify-center`}>
                      {lead.mqlEnrichment?.mqlRating || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.fullAnalysis?.pps_score ? (
                      <span className="font-semibold">{lead.fullAnalysis.pps_score}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {lead.fullAnalysis?.primary_concern_category || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>
    </div>
  );
};
