import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadWizard } from '@/components/UploadWizard';
import { SummaryCards } from '@/components/SummaryCards';
import { LeadsTable } from '@/components/LeadsTable';
import { LeadReportModal } from '@/components/LeadReportModal';
import { parseExcelFile } from '@/utils/excelParser';
import { exportLeadsToExcel } from '@/utils/excelExport';
import { Lead, AnalysisResult } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ExcelSchema } from '@/config/projects';
import type { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect to auth if not authenticated
        if (!session) {
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileSelect = async (file: File, projectId: string) => {
    setIsLoading(true);
    try {
      // Fetch project with brand schema for validation
      const { data: project, error } = await supabase
        .from('projects')
        .select('*, brands(*)')
        .eq('id', projectId)
        .single();

      if (error || !project) {
        toast({
          title: 'Error',
          description: 'Failed to fetch project details',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const schema = project.brands.excel_schema as unknown as ExcelSchema;
      
      const parsedLeads = await parseExcelFile(file, schema);
      
      // Validate max 50 leads
      if (parsedLeads.length > 50) {
        toast({
          title: 'Too many leads',
          description: 'Maximum 50 leads allowed per file. Please reduce the number of leads.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      setLeads(parsedLeads);
      setSelectedProjectId(projectId);
      toast({
        title: 'File parsed successfully',
        description: `Loaded ${parsedLeads.length} leads from the Excel file.`,
      });
    } catch (error) {
      toast({
        title: 'Error parsing file',
        description: error instanceof Error ? error.message : 'Please check the file format.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeLeads = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-leads', {
        body: { 
          leads,
          projectId: selectedProjectId
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze leads');
      }

      if (data?.results) {
        const updatedLeads = leads.map(lead => {
          const analysis = data.results.find((r: AnalysisResult) => r.leadId === lead.id);
          if (analysis) {
            return {
              ...lead,
              rating: analysis.rating,
              aiInsights: analysis.insights,
              fullAnalysis: analysis.fullAnalysis,
            };
          }
          return lead;
        });
        setLeads(updatedLeads);
        
        // Show detailed success message with cache info
        const meta = data.meta || {};
        const cachedCount = meta.cached || 0;
        const freshCount = meta.fresh || 0;
        
        let description = `Successfully analyzed ${data.results.length} leads.`;
        if (cachedCount > 0 && freshCount > 0) {
          description = `Analyzed ${data.results.length} leads (${cachedCount} from cache, ${freshCount} fresh analysis).`;
        } else if (cachedCount > 0 && freshCount === 0) {
          description = `Retrieved ${cachedCount} leads from cache (no fresh analysis needed).`;
        }
        
        toast({
          title: 'Analysis complete',
          description,
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze leads. Make sure your Google AI API key is configured.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setLeads([]);
    setSelectedProjectId('');
    setRatingFilter(null);
  };

  const handleExport = () => {
    exportLeadsToExcel(leads);
    toast({
      title: 'Export successful',
      description: 'Leads data has been exported to Excel.',
    });
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    navigate('/auth');
  };

  // Don't render until we know auth status
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={handleLogout} size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">CRM Lead Analyzer</h1>
          <p className="text-lg text-muted-foreground">
            Upload your Excel file to analyze and rate your real estate leads
          </p>
        </div>

        {leads.length === 0 ? (
          <UploadWizard onFileSelect={handleFileSelect} isLoading={isLoading} />
        ) : (
          <div className="space-y-8">
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button 
                onClick={handleAnalyzeLeads} 
                disabled={isAnalyzing} 
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
              <Button variant="outline" onClick={handleReset} size="lg">
                <Upload className="mr-2 h-5 w-5" />
                Upload New File
              </Button>
            </div>

            {/* Summary Cards */}
            <SummaryCards 
              leads={leads} 
              onFilterChange={setRatingFilter}
              activeFilter={ratingFilter}
            />

            {/* Leads Table */}
            <LeadsTable
              leads={leads}
              onLeadClick={handleLeadClick}
              ratingFilter={ratingFilter}
              onExport={handleExport}
            />

            {/* Lead Report Modal */}
            <LeadReportModal
              lead={selectedLead}
              open={modalOpen}
              onOpenChange={setModalOpen}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
