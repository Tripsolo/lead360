import { useState } from 'react';
import { Lead } from '@/types/lead';
import { PpsCircle } from '@/components/PpsCircle';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Database, Sparkles, Upload, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  ratingFilter: string | null;
  onExport: () => void;
  onEnrich?: () => void;
  onAnalyze?: () => void;
  onNew?: () => void;
  onReanalyze?: () => void;
  isEnriching?: boolean;
  isAnalyzing?: boolean;
  isReanalyzing?: boolean;
  failedAnalysisCount?: number;
}

type SortField = 'name' | 'date' | 'rating' | 'phone' | 'mqlRating' | 'ppsScore';
type SortDirection = 'asc' | 'desc' | null;

const ratingOrder: Record<string, number> = { 'hot': 3, 'warm': 2, 'cold': 1 };
const getRatingValue = (rating?: string) => ratingOrder[String(rating || '').toLowerCase()] || 0;

const getRatingColor = (rating?: string) => {
  switch (rating?.toLowerCase()) {
    case 'hot': return 'bg-status-hot text-white';
    case 'warm': return 'bg-status-warm text-white';
    case 'cold': return 'bg-status-cold text-white';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getRatingTextColor = (rating?: string) => {
  switch (rating?.toLowerCase()) {
    case 'hot': return 'text-status-hot';
    case 'warm': return 'text-status-warm';
    case 'cold': return 'text-status-cold';
    default: return 'text-muted-foreground';
  }
};

const getMqlRatingTextColor = (rating?: string) => {
  switch (rating) {
    case 'P0': return 'text-status-hot';
    case 'P1': return 'text-status-warm';
    case 'P2': return 'text-status-cold';
    default: return 'text-muted-foreground';
  }
};

const formatRating = (rating?: string) => {
  if (!rating) return '-';
  return rating.charAt(0).toUpperCase() + rating.slice(1).toLowerCase();
};

// PpsCircle imported from shared component

export const LeadsTable = ({ leads, onLeadClick, ratingFilter, onExport, onEnrich, onAnalyze, onNew, onReanalyze, isEnriching, isAnalyzing, isReanalyzing, failedAnalysisCount }: LeadsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [managerRatingFilter, setManagerRatingFilter] = useState<string>('all');
  const [aiRatingFilter, setAiRatingFilter] = useState<string>('all');
  const [mqlRatingFilter, setMqlRatingFilter] = useState<string>('all');
  const [concernFilter, setConcernFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const leadOwners = Array.from(new Set(leads.map(l => l.leadOwner).filter(Boolean)));
  const projects = Array.from(new Set(leads.map(l => l.projectInterest).filter(Boolean)));
  const concerns = Array.from(new Set(leads.map(l => l.fullAnalysis?.primary_concern_category).filter(Boolean)));

  const activeFilterCount = [ownerFilter, projectFilter, managerRatingFilter, aiRatingFilter, mqlRatingFilter, concernFilter]
    .filter(f => f !== 'all').length;

  const resetFilters = () => {
    setOwnerFilter('all');
    setProjectFilter('all');
    setManagerRatingFilter('all');
    setAiRatingFilter('all');
    setMqlRatingFilter('all');
    setConcernFilter('all');
  };

  // Filter leads
  let filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      String(lead.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(lead.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(lead.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesRatingComparison = true;
    if (ratingFilter === 'Upgraded') {
      matchesRatingComparison = !!(lead.rating && lead.managerRating && getRatingValue(lead.rating) > getRatingValue(lead.managerRating));
    } else if (ratingFilter === 'Downgraded') {
      matchesRatingComparison = !!(lead.rating && lead.managerRating && getRatingValue(lead.rating) < getRatingValue(lead.managerRating));
    } else if (ratingFilter === 'Unchanged') {
      matchesRatingComparison = !!(lead.rating && lead.managerRating && getRatingValue(lead.rating) === getRatingValue(lead.managerRating));
    } else if (ratingFilter === 'Hot') {
      matchesRatingComparison = lead.managerRating?.toLowerCase() === 'hot';
    } else if (ratingFilter === 'Warm') {
      matchesRatingComparison = lead.managerRating?.toLowerCase() === 'warm';
    } else if (ratingFilter === 'Cold') {
      matchesRatingComparison = lead.managerRating?.toLowerCase() === 'cold';
    }

    const matchesOwner = ownerFilter === 'all' || lead.leadOwner === ownerFilter;
    const matchesProject = projectFilter === 'all' || lead.projectInterest === projectFilter;
    const matchesManagerRating = managerRatingFilter === 'all' || lead.managerRating?.toLowerCase() === managerRatingFilter.toLowerCase();
    const matchesAiRating = aiRatingFilter === 'all' || lead.rating?.toLowerCase() === aiRatingFilter.toLowerCase();
    const matchesMqlRating = mqlRatingFilter === 'all' || lead.mqlEnrichment?.mqlRating === mqlRatingFilter;
    const matchesConcern = concernFilter === 'all' || lead.fullAnalysis?.primary_concern_category === concernFilter;

    return matchesSearch && matchesRatingComparison && matchesOwner && matchesProject && matchesManagerRating && matchesAiRating && matchesMqlRating && matchesConcern;
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
        aVal = ratingOrder[String(aVal || '').toLowerCase()] || 0;
        bVal = ratingOrder[String(bVal || '').toLowerCase()] || 0;
      } else if (sortField !== 'mqlRating' && sortField !== 'ppsScore') {
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
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortDirection(null); setSortField(null); }
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

  return (
    <div className="space-y-4">
      {/* Toolbar: action buttons left, search + filter right */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch w-full">
        {/* Left: action buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          {(failedAnalysisCount ?? 0) > 0 && onReanalyze && (
            <Button 
              onClick={onReanalyze} 
              disabled={isReanalyzing || isAnalyzing || isEnriching} 
              variant="outline"
              size="sm"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
              {isReanalyzing ? 'Re-analyzing...' : `Re-analyze Failed (${failedAnalysisCount})`}
            </Button>
          )}
          {onEnrich && (
            <Button 
              onClick={onEnrich} 
              disabled={isEnriching || isAnalyzing} 
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Database className="mr-2 h-4 w-4" />
              {isEnriching ? 'Enriching...' : 'Enrich'}
            </Button>
          )}
          {onAnalyze && (
            <Button 
              onClick={onAnalyze} 
              disabled={isAnalyzing || isEnriching || isReanalyzing} 
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Ask AI'}
            </Button>
          )}
          {onNew && (
            <Button variant="outline" size="sm" onClick={onNew}>
              <Upload className="mr-2 h-4 w-4" />
              New
            </Button>
          )}
        </div>
        <div className="flex-1" />
        {/* Right: search + filter */}
        <div className="flex gap-2 items-center">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Lead ID, Phone, or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-1 block">Project</label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Owner</label>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger><SelectValue placeholder="All Owners" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {leadOwners.map(o => <SelectItem key={o} value={o!}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Manager Rating</label>
                  <Select value={managerRatingFilter} onValueChange={setManagerRatingFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Hot">Hot</SelectItem>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="Cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">AI Rating</label>
                  <Select value={aiRatingFilter} onValueChange={setAiRatingFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Hot">Hot</SelectItem>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="Cold">Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">MQL Rating</label>
                  <Select value={mqlRatingFilter} onValueChange={setMqlRatingFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {['P0','P1','P2','P3','P4','P5'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Key Concern</label>
                  <Select value={concernFilter} onValueChange={setConcernFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {concerns.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={resetFilters} className="w-full mt-4">
                  Reset Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Table - reordered columns: Name, Project, Phone, Owner, Last Visit, Manager, MQL, AI, PPS, Key Concern */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('name')} className="h-8 px-2">
                  Name
                  <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('phone')} className="h-8 px-2">
                  Phone
                  <SortIcon field="phone" />
                </Button>
              </TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('date')} className="h-8 px-2">
                  Last Visit
                  <SortIcon field="date" />
                </Button>
              </TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('mqlRating')} className="h-8 px-2">
                  MQL
                  <SortIcon field="mqlRating" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('rating')} className="h-8 px-2">
                  AI
                  <SortIcon field="rating" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('ppsScore')} className="h-8 px-2">
                  PPS
                  <SortIcon field="ppsScore" />
                </Button>
              </TableHead>
              <TableHead>Key Concern</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>{lead.leadOwner || '-'}</TableCell>
                  <TableCell>
                    {lead.date ? format(new Date(lead.date), 'dd MMM') : '-'}
                  </TableCell>
                  {/* Manager Rating - text only, no badge */}
                  <TableCell>
                    <span className={`font-semibold ${getRatingTextColor(lead.managerRating)}`}>
                      {formatRating(lead.managerRating)}
                    </span>
                  </TableCell>
                  {/* MQL Rating - text only, no badge */}
                  <TableCell>
                    <span className={`font-semibold ${getMqlRatingTextColor(lead.mqlEnrichment?.mqlRating)}`}>
                      {lead.mqlEnrichment?.mqlRating || '-'}
                    </span>
                  </TableCell>
                  {/* AI Rating - keeps badge */}
                  <TableCell>
                    {lead.rating ? (
                      <Badge className={`${getRatingColor(lead.rating)} min-w-[60px] justify-center`}>
                        {formatRating(lead.rating)}
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground min-w-[60px] justify-center">-</Badge>
                    )}
                  </TableCell>
                  {/* PPS - circular progress */}
                  <TableCell>
                    {lead.fullAnalysis?.pps_score ? (
                      <PpsCircle score={lead.fullAnalysis.pps_score} size="sm" />
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
