import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Flame, Sun, Snowflake, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjectAnalytics } from "@/hooks/useProjectAnalytics";

interface Project {
  id: string;
  name: string;
}

const ProjectAnalytics = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [loadingProjects, setLoadingProjects] = useState(true);

  const { analytics, loading, error } = useProjectAnalytics(selectedProjectId);

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Project Analytics</h1>
          <p className="text-sm text-muted-foreground">Powered by Raisn.ai</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.totalLeads}</p>
                  <p className="text-xs text-muted-foreground">{analytics.analyzedLeads} analyzed</p>
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
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Hot</TableHead>
                        <TableHead className="text-center">Warm</TableHead>
                        <TableHead className="text-center">Cold</TableHead>
                        <TableHead className="text-center">% Upgraded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.managerPerformance.map((manager) => (
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
            <Card>
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
                        <TableHead>Sub Source</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Hot</TableHead>
                        <TableHead className="text-center">Warm</TableHead>
                        <TableHead className="text-center">Cold</TableHead>
                        <TableHead className="text-center">% Upgraded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.sourcePerformance.map((source, index) => (
                        <TableRow key={`${source.source}-${source.subSource}-${index}`}>
                          <TableCell className="font-medium">{source.source}</TableCell>
                          <TableCell>{source.subSource}</TableCell>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectAnalytics;
