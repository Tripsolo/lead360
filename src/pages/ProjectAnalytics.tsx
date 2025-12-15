import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Flame, Sun, Snowflake, TrendingUp, Loader2, Eye, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAnalytics } from "@/hooks/useProjectAnalytics";

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
  
  // Sorting state for Manager Performance table
  const [managerSortField, setManagerSortField] = useState<SortField>('total');
  const [managerSortDirection, setManagerSortDirection] = useState<SortDirection>('desc');
  
  // Sorting state for Source Performance table
  const [sourceSortField, setSourceSortField] = useState<SortField>('total');
  const [sourceSortDirection, setSourceSortDirection] = useState<SortDirection>('desc');

  const { analytics, loading, error } = useProjectAnalytics(selectedProjectId);
  
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">Project Analytics</h1>
            <p className="text-sm text-muted-foreground">Powered by Raisn.ai · Showing AI-rated leads only</p>
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

        {/* Project Filter */}
        <div className="mb-8">
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
                    <Flame className="h-4 w-4 text-rating-hot" />
                    Hot Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-rating-hot">{analytics.hotLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sun className="h-4 w-4 text-rating-warm" />
                    Warm Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-rating-warm">{analytics.warmLeads}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-rating-cold" />
                    Cold Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-rating-cold">{analytics.coldLeads}</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedManagerPerformance.map((manager) => (
                        <TableRow key={manager.name}>
                          <TableCell className="font-medium">{manager.name}</TableCell>
                          <TableCell className="text-center">{manager.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rating-hot/10 text-rating-hot border-rating-hot/20">
                              {manager.hot}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rating-warm/10 text-rating-warm border-rating-warm/20">
                              {manager.warm}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rating-cold/10 text-rating-cold border-rating-cold/20">
                              {manager.cold}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{manager.upgradePercentage}%</Badge>
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
                            <Badge variant="outline" className="bg-rating-hot/10 text-rating-hot border-rating-hot/20">
                              {source.hot}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rating-warm/10 text-rating-warm border-rating-warm/20">
                              {source.warm}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rating-cold/10 text-rating-cold border-rating-cold/20">
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
