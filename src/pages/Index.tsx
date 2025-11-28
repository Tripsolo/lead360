import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { LeadsList } from '@/components/LeadsList';
import { parseExcelFile } from '@/utils/excelParser';
import { Lead, AnalysisResult } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const parsedLeads = await parseExcelFile(file);
      setLeads(parsedLeads);
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
    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: 'Supabase not connected',
        description: 'Please connect your Supabase project in Settings → Integrations to enable AI analysis.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-leads', {
        body: { leads },
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
        description: error instanceof Error ? error.message : 'Failed to analyze leads. Make sure your OpenRouter API key is configured in Supabase secrets.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setLeads([]);
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
          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <Button onClick={handleAnalyzeLeads} disabled={isAnalyzing}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New File
                </Button>
              </div>
            </div>

            <LeadsList leads={leads} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
