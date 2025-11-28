import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { LeadsList } from '@/components/LeadsList';
import { parseExcelFile } from '@/utils/excelParser';
import { Lead } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload } from 'lucide-react';

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
    setIsAnalyzing(true);
    try {
      // This will be implemented once Supabase is connected
      toast({
        title: 'AI Analysis',
        description: 'Please connect to Supabase and add your OpenRouter API key to enable AI analysis.',
      });
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze leads.',
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
