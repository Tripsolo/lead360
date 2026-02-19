import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Users, Flame, Sun, Snowflake, TrendingUp, Loader2, Eye, ArrowUp, ArrowDown, CalendarIcon, X, Calculator } from "lucide-react";
import raisnLogo from '@/assets/raisn-logo.png';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAnalytics } from "@/hooks/useProjectAnalytics";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

type SortField = 'total' | 'upgradePercentage';
type SortDirection = 'asc' | 'desc';

const ProjectAnalytics = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Date filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // CIS calculation state
  const [calculatingCIS, setCalculatingCIS] = useState(false);
  const [cisProgress, setCisProgress] = useState({ current: 0, total: 0 });
  
  // Sorting state for Manager Performance table
  const [managerSortField, setManagerSortField] = useState<SortField>('total');
  const [managerSortDirection, setManagerSortDirection] = useState<SortDirection>('desc');
  
  // Sorting state for Source Performance table
  const [sourceSortField, setSourceSortField] = useState<SortField>('total');
  const [sourceSortDirection, setSourceSortDirection] = useState<SortDirection>('desc');

  const { analytics, loading, error } = useProjectAnalytics(selectedProjectId, startDate, endDate);
  
  // Sorted manager performance data
  const sortedManagerPerformance = useMemo(() => {
    return [...analytics.managerPerformance].sort((a, b) => {
      const aVal = a[managerSortField];
      const bVal = b[managerSortField];
      return managerSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [analytics.managerPerformance, managerSortField, managerSortDirection]);
  
  // Sorted source performance data
  const sortedSourcePerformance = useMemo(() => {
    return [...analytics.sourcePerformance].sort((a, b) => {
      const aVal = a[sourceSortField];
      const bVal = b[sourceSortField];
      return sourceSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [analytics.sourcePerformance, sourceSortField, sourceSortDirection]);
  
  const handleManagerSort = (field: SortField) => {
    if (managerSortField === field) {
      setManagerSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setManagerSortField(field);
      setManagerSortDirection('desc');
    }
  };
  
  const handleSourceSort = (field: SortField) => {
    if (sourceSortField === field) {
      setSourceSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSourceSortField(field);
      setSourceSortDirection('desc');
    }
  };
  
  const SortIcon = ({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) => {
    if (field !== currentField) return null;
    return direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCalculateCIS = async () => {
    try {
      setCalculatingCIS(true);
      
      // Fetch leads without CIS scores
      let query = supabase
        .from('lead_analyses')
        .select('id, lead_id, project_id, full_analysis');
      
      if (selectedProjectId && selectedProjectId !== 'all') {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data: analyses, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      // Filter to leads without CIS
      const leadsNeedingCIS = (analyses || []).filter(a => {
        const signals = (a.full_analysis as Record<string, unknown>)?.extracted_signals as Record<string, unknown> | undefined;
        return !signals?.crm_compliance_assessment;
      });
      
      if (leadsNeedingCIS.length === 0) {
        toast.info("All leads already have CIS scores");
        return;
      }
      
      setCisProgress({ current: 0, total: leadsNeedingCIS.length });
      
      // Get CRM data for these leads
      const leadIds = leadsNeedingCIS.map(a => a.lead_id);
      const { data: leadsData } = await supabase
        .from('leads')
        .select('lead_id, crm_data')
        .in('lead_id', leadIds);
      
      const crmDataMap = new Map((leadsData || []).map(l => [l.lead_id, l.crm_data]));
      
      // Process in batches of 5
      const BATCH_SIZE = 5;
      for (let i = 0; i < leadsNeedingCIS.length; i += BATCH_SIZE) {
        const batch = leadsNeedingCIS.slice(i, i + BATCH_SIZE);
        
        const { data, error: calcError } = await supabase.functions.invoke('calculate-cis', {
          body: {
            leads: batch.map(a => ({
              analysisId: a.id,
              leadId: a.lead_id,
              crmData: crmDataMap.get(a.lead_id),
              fullAnalysis: a.full_analysis
            }))
          }
        });
        
        if (calcError) {
          console.error('CIS calculation error:', calcError);
          toast.error(`Error calculating CIS: ${calcError.message}`);
        }
        
        setCisProgress({ current: Math.min(i + BATCH_SIZE, leadsNeedingCIS.length), total: leadsNeedingCIS.length });
      }
      
      toast.success(`CIS scores calculated for ${leadsNeedingCIS.length} leads`);
      // Refresh the page to show updated scores
      window.location.reload();
    } catch (err) {
      console.error('Error calculating CIS:', err);
      toast.error('Failed to calculate CIS scores');
    } finally {
      setCalculatingCIS(false);
    }
  };

  const handleViewLeads = () => {
    const params = new URLSearchParams();
    if (selectedProjectId && selectedProjectId !== 'all') {
      params.set('project', selectedProjectId);
    }
    params.set('view', 'ai-rated');
    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Branded navbar */}
        <nav className="bg-card border-b border-border sticky top-0 z-50 -mx-4 -mt-8 px-4 mb-6">
          <div className="container mx-auto flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mr-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={raisnLogo} alt="Raisn" className="h-8" />
              <span className="text-lg font-semibold text-foreground">Customer360</span>
            </div>
            <Button 
              onClick={handleViewLeads}
              disabled={analytics.totalLeads === 0}
              className="bg-primary"
            >
              <Eye className="mr-2 h-4 w-4" />
              View AI Rated Leads
            </Button>
          </div>
        </nav>

        <div className="flex justify-between items-start mb-8">
          <h1 className="text-xl font-semibold">Project Analytics</h1>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Filter by Project
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              From Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-40 justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate || undefined}
                  onSelect={(date) => setStartDate(date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              To Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-40 justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => setEndDate(date || null)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
              }}
              className="h-10"
            >
              <X className="mr-1 h-4 w-4" />
              Clear Dates
            </Button>
          )}
          
          <div className="ml-auto">
            <Button
              onClick={handleCalculateCIS}
              disabled={calculatingCIS || analytics.totalLeads === 0}
              variant="outline"
            >
              {calculatingCIS ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {cisProgress.current}/{cisProgress.total}
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate CIS Scores
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    AI Rated Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.totalLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Flame className="h-4 w-4 text-status-hot" />
                    Hot Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-status-hot">{analytics.hotLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sun className="h-4 w-4 text-status-warm" />
                    Warm Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-status-warm">{analytics.warmLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-status-cold" />
                    Cold Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-status-cold">{analytics.coldLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Upgraded by AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{analytics.upgradePercentage}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Manager Performance Table */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Manager Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.managerPerformance.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Manager Name</TableHead>
                        <TableHead className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 hover:bg-transparent font-medium"
                            onClick={() => handleManagerSort('total')}
                          >
                            Total
                            <SortIcon field="total" currentField={managerSortField} direction={managerSortDirection} />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">Hot</TableHead>
                        <TableHead className="text-center">Warm</TableHead>
                        <TableHead className="text-center">Cold</TableHead>
                        <TableHead className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 hover:bg-transparent font-medium"
                            onClick={() => handleManagerSort('upgradePercentage')}
                          >
                            % Upgraded
                            <SortIcon field="upgradePercentage" currentField={managerSortField} direction={managerSortDirection} />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">Avg CIS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedManagerPerformance.map((manager) => (
                        <TableRow key={manager.name}>
                          <TableCell className="font-medium">{manager.name}</TableCell>
                          <TableCell className="text-center">{manager.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-hot/10 text-status-hot border-status-hot/20">
                              {manager.hot}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-warm/10 text-status-warm border-status-warm/20">
                              {manager.warm}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-cold/10 text-status-cold border-status-cold/20">
                              {manager.cold}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{manager.upgradePercentage}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={
                                manager.avgCIS >= 70 
                                  ? "bg-status-hot/10 text-status-hot border-status-hot/20" 
                                  : manager.avgCIS >= 50 
                                    ? "bg-status-warm/10 text-status-warm border-status-warm/20" 
                                    : "bg-status-cold/10 text-status-cold border-status-cold/20"
                              }
                            >
                              {manager.avgCIS > 0 ? manager.avgCIS : 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Source Performance Table */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Source Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.sourcePerformance.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 hover:bg-transparent font-medium"
                            onClick={() => handleSourceSort('total')}
                          >
                            Total
                            <SortIcon field="total" currentField={sourceSortField} direction={sourceSortDirection} />
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">Hot</TableHead>
                        <TableHead className="text-center">Warm</TableHead>
                        <TableHead className="text-center">Cold</TableHead>
                        <TableHead className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto p-0 hover:bg-transparent font-medium"
                            onClick={() => handleSourceSort('upgradePercentage')}
                          >
                            % Upgraded
                            <SortIcon field="upgradePercentage" currentField={sourceSortField} direction={sourceSortDirection} />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSourcePerformance.map((source, index) => (
                        <TableRow key={`${source.subSource}-${index}`}>
                          <TableCell className="font-medium">{source.subSource}</TableCell>
                          <TableCell className="text-center">{source.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-hot/10 text-status-hot border-status-hot/20">
                              {source.hot}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-warm/10 text-status-warm border-status-warm/20">
                              {source.warm}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-status-cold/10 text-status-cold border-status-cold/20">
                              {source.cold}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{source.upgradePercentage}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Concern Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle>Concern Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.concernAnalysis.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No concern data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concern Type</TableHead>
                        <TableHead className="text-center">% of Leads</TableHead>
                        <TableHead>Dominant Persona</TableHead>
                        <TableHead>Dominant Profession</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.concernAnalysis.map((concern) => (
                        <TableRow key={concern.concernType}>
                          <TableCell className="font-medium">{concern.concernType}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{concern.percentage}%</Badge>
                          </TableCell>
                          <TableCell>{concern.dominantPersona}</TableCell>
                          <TableCell>{concern.dominantProfession}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalytics;
