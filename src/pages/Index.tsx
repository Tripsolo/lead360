import { useState } from 'react';
import { UploadWizard } from '@/components/UploadWizard';
import { SummaryCards } from '@/components/SummaryCards';
import { LeadsTable } from '@/components/LeadsTable';
import { LeadReportModal } from '@/components/LeadReportModal';
import { parseExcelFile } from '@/utils/excelParser';
import { exportLeadsToExcel } from '@/utils/excelExport';
import { Lead, AnalysisResult } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectById, getBrandByProjectId } from '@/config/projects';

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File, projectId: string) => {
    setIsLoading(true);
    try {
      // Get brand schema for validation
      const brand = getBrandByProjectId(projectId);
      const schema = brand?.excelSchema;
      
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
      // Get project metadata for context
      const project = getProjectById(selectedProjectId);
      
      const { data, error } = await supabase.functions.invoke('analyze-leads', {
        body: { 
          leads,
          projectMetadata: project?.metadata 
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
        toast({
          title: 'Analysis complete',
          description: `Successfully analyzed ${data.results.length} leads with AI.`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
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
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-3">
                <Button onClick={handleAnalyzeLeads} disabled={isAnalyzing} size="lg">
                  <Sparkles className="mr-2 h-5 w-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
                <Button variant="outline" onClick={handleReset} size="lg">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload New File
                </Button>
              </div>
              <Button variant="outline" onClick={handleExport} size="lg">
                <Download className="mr-2 h-5 w-5" />
                Export to Excel
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
