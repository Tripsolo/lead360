import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadWizard } from '@/components/UploadWizard';
import { SummaryCards } from '@/components/SummaryCards';
import { LeadsTable } from '@/components/LeadsTable';
import { LeadReportModal } from '@/components/LeadReportModal';
import { parseExcelFile } from '@/utils/excelParser';
import { exportLeadsToExcel } from '@/utils/excelExport';
import { Lead, AnalysisResult, MqlEnrichment } from '@/types/lead';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Upload, LogOut, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ExcelSchema } from '@/config/projects';
import type { User, Session } from '@supabase/supabase-js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper to convert Excel serial dates to ISO strings
const excelDateToISOString = (excelDate: any): string | null => {
  if (!excelDate) return null;
  
  // If it's already a valid ISO string or date string, return as-is
  if (typeof excelDate === 'string' && isNaN(Number(excelDate))) {
    return excelDate;
  }
  
  // If it's a number (Excel serial date), convert it
  if (typeof excelDate === 'number' || !isNaN(Number(excelDate))) {
    const numDate = Number(excelDate);
    // Excel dates start from 1900-01-01 (serial 1)
    // JavaScript Date epoch adjustment: Dec 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + numDate * 24 * 60 * 60 * 1000);
    return jsDate.toISOString();
  }
  
  return null;
};

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showEnrichPrompt, setShowEnrichPrompt] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        }
      }
    );

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
      
      if (parsedLeads.length > 50) {
        toast({
          title: 'Too many leads',
          description: 'Maximum 50 leads allowed per file. Please reduce the number of leads.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const leadIds = parsedLeads.map(lead => lead.id);
      
      // Store leads in database immediately to prevent orphaning
      const leadsToStore = parsedLeads.map(lead => ({
        lead_id: lead.id,
        project_id: projectId,
        crm_data: lead.rawData,
        latest_revisit_date: excelDateToISOString(lead.rawData?.["Latest Revisit Date"]),
      }));

      const { error: upsertError } = await supabase
        .from('leads')
        .upsert(leadsToStore, { onConflict: 'lead_id,project_id' });

      if (upsertError) {
        console.error('Error storing leads:', upsertError);
      } else {
        console.log(`Stored ${leadsToStore.length} leads in database`);
      }
      
      // Fetch cached analyses
      const { data: cachedAnalyses } = await supabase
        .from('lead_analyses')
        .select('lead_id, rating, insights, full_analysis')
        .in('lead_id', leadIds)
        .eq('project_id', projectId);
      
      // Fetch cached enrichments
      const { data: cachedEnrichments } = await supabase
        .from('lead_enrichments')
        .select('*')
        .in('lead_id', leadIds)
        .eq('project_id', projectId);

      // Merge cached data into parsed leads
      const enrichedLeads = parsedLeads.map(lead => {
        const cached = cachedAnalyses?.find(a => a.lead_id === lead.id);
        const enrichment = cachedEnrichments?.find(e => e.lead_id === lead.id);
        
        let mqlEnrichment: MqlEnrichment | undefined;
        if (enrichment) {
          mqlEnrichment = {
            mqlRating: enrichment.mql_rating || undefined,
            mqlCapability: enrichment.mql_capability || undefined,
            mqlLifestyle: enrichment.mql_lifestyle || undefined,
            creditScore: enrichment.credit_score || undefined,
            age: enrichment.age || undefined,
            gender: enrichment.gender || undefined,
            location: enrichment.location || undefined,
            localityGrade: enrichment.locality_grade || undefined,
            lifestyle: enrichment.lifestyle || undefined,
            finalIncomeLacs: enrichment.final_income_lacs ? Number(enrichment.final_income_lacs) : undefined,
            employerName: enrichment.employer_name || undefined,
            designation: enrichment.designation || undefined,
            totalLoans: enrichment.total_loans || undefined,
            activeLoans: enrichment.active_loans || undefined,
            homeLoans: enrichment.home_loans || undefined,
            autoLoans: enrichment.auto_loans || undefined,
            highestCardUsagePercent: enrichment.highest_card_usage_percent ? Number(enrichment.highest_card_usage_percent) : undefined,
            isAmexHolder: enrichment.is_amex_holder || undefined,
            enrichedAt: enrichment.enriched_at || undefined,
            rawResponse: enrichment.raw_response as Record<string, any> || undefined,
          };
        }
        
        if (cached) {
          return {
            ...lead,
            rating: cached.rating as Lead['rating'],
            aiInsights: cached.insights || undefined,
            fullAnalysis: cached.full_analysis as Lead['fullAnalysis'],
            mqlEnrichment,
          };
        }
        return { ...lead, mqlEnrichment };
      });

      setLeads(enrichedLeads);
      setSelectedProjectId(projectId);
      
      const cachedCount = cachedAnalyses?.length || 0;
      const enrichedCount = cachedEnrichments?.length || 0;
      
      // Check for orphaned enrichments (enriched but not analyzed)
      const orphanedEnrichments = cachedEnrichments?.filter(
        e => !cachedAnalyses?.some(a => a.lead_id === e.lead_id)
      ) || [];
      
      let description = `Loaded ${parsedLeads.length} leads from the Excel file.`;
      if (cachedCount > 0) {
        description += ` (${cachedCount} with cached analysis`;
        if (enrichedCount > 0) {
          description += `, ${enrichedCount} enriched`;
        }
        description += ')';
      } else if (enrichedCount > 0) {
        description += ` (${enrichedCount} enriched)`;
      }
      
      toast({
        title: 'File parsed successfully',
        description,
      });
      
      // Warn about orphaned enrichments that need analysis
      if (orphanedEnrichments.length > 0) {
        toast({
          title: 'Leads need analysis',
          description: `${orphanedEnrichments.length} enriched lead(s) have not been analyzed yet. Click "Analyze with AI" to complete.`,
          variant: 'default',
        });
      }
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

  // Helper function to update leads with enrichment data (uses functional update to avoid stale closure)
  const updateLeadsWithEnrichments = (enrichments: any[]) => {
    setLeads(currentLeads => 
      currentLeads.map(lead => {
        const enrichment = enrichments.find((e: any) => e.lead_id === lead.id);
        if (enrichment) {
          return {
            ...lead,
            mqlEnrichment: {
              mqlRating: enrichment.mql_rating || undefined,
              mqlCapability: enrichment.mql_capability || undefined,
              mqlLifestyle: enrichment.mql_lifestyle || undefined,
              creditScore: enrichment.credit_score || undefined,
              age: enrichment.age || undefined,
              gender: enrichment.gender || undefined,
              location: enrichment.location || undefined,
              employerName: enrichment.employer_name || undefined,
              designation: enrichment.designation || undefined,
              totalLoans: enrichment.total_loans || undefined,
              activeLoans: enrichment.active_loans || undefined,
              homeLoans: enrichment.home_loans || undefined,
              autoLoans: enrichment.auto_loans || undefined,
              highestCardUsagePercent: enrichment.highest_card_usage_percent || undefined,
              isAmexHolder: enrichment.is_amex_holder || undefined,
              enrichedAt: enrichment.enriched_at || undefined,
              rawResponse: enrichment.raw_response as Record<string, any> || undefined,
            } as MqlEnrichment,
          };
        }
        return lead;
      })
    );
  };

  // Poll for enrichment results
  const pollForEnrichmentResults = async (leadIdsToCheck: string[], maxAttempts = 30) => {
    let attempts = 0;
    const pollInterval = 5000; // 5 seconds

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling for enrichment results, attempt ${attempts}/${maxAttempts}`);

      const { data: enrichments } = await supabase
        .from('lead_enrichments')
        .select('*')
        .in('lead_id', leadIdsToCheck)
        .eq('project_id', selectedProjectId);

      if (enrichments && enrichments.length >= leadIdsToCheck.length) {
        // All leads have been enriched
        updateLeadsWithEnrichments(enrichments);
        
        const successCount = enrichments.filter(e => e.mql_rating && e.mql_rating !== 'N/A').length;
        const noDataCount = enrichments.filter(e => {
          const rawResponse = e.raw_response as Record<string, any> | null;
          return e.mql_rating === 'N/A' && rawResponse?.leads?.[0]?.error === 'DATA_NOT_FOUND';
        }).length;
        const failedCount = enrichments.filter(e => {
          const rawResponse = e.raw_response as Record<string, any> | null;
          return e.mql_rating === 'N/A' && rawResponse?.leads?.[0]?.error !== 'DATA_NOT_FOUND';
        }).length;
        
        let description = `100% complete - ${successCount} enriched`;
        if (noDataCount > 0) description += `, ${noDataCount} no data found`;
        if (failedCount > 0) description += `, ${failedCount} failed`;
        
        toast({
          title: 'Enrichment complete',
          description,
        });
        return true;
      }

      // Update UI with partial results (show percentage)
      if (enrichments && enrichments.length > 0) {
        updateLeadsWithEnrichments(enrichments);
        const percentComplete = Math.round((enrichments.length / leadIdsToCheck.length) * 100);
        toast({
          title: 'Enrichment in progress',
          description: `${percentComplete}% complete (${enrichments.length}/${leadIdsToCheck.length} leads)...`,
        });
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Max attempts reached, show what we have
    const { data: finalEnrichments } = await supabase
      .from('lead_enrichments')
      .select('*')
      .in('lead_id', leadIdsToCheck)
      .eq('project_id', selectedProjectId);

    if (finalEnrichments && finalEnrichments.length > 0) {
      updateLeadsWithEnrichments(finalEnrichments);
    }

    const finalPercentComplete = Math.round(((finalEnrichments?.length || 0) / leadIdsToCheck.length) * 100);
    toast({
      title: 'Enrichment partially complete',
      description: `${finalPercentComplete}% complete (${finalEnrichments?.length || 0}/${leadIdsToCheck.length} leads). Some leads may still be processing.`,
    });
    return false;
  };

  const handleEnrichLeads = async () => {
    setIsEnriching(true);
    try {
      // Split leads into smaller batches (max 3 per batch) to avoid timeout
      const BATCH_SIZE = 3;
      const allLeads = leads.map(l => ({ id: l.id, name: l.name, phone: l.phone }));
      const batches: typeof allLeads[] = [];
      
      for (let i = 0; i < allLeads.length; i += BATCH_SIZE) {
        batches.push(allLeads.slice(i, i + BATCH_SIZE));
      }

      const leadIdsToCheck = allLeads.map(l => l.id);
      
      toast({
        title: 'Starting enrichment',
        description: `Processing ${allLeads.length} leads in ${batches.length} batches...`,
      });

      // Start all batch function calls sequentially (they process in background)
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const percentInitiated = Math.round(((i + 1) / batches.length) * 100);
        
        console.log(`Starting enrichment batch ${i + 1}/${batches.length} with ${batch.length} leads`);
        
        const { error } = await supabase.functions.invoke('enrich-leads', {
          body: { 
            leads: batch,
            projectId: selectedProjectId
          },
        });

        if (error) {
          console.error(`Batch ${i + 1} error:`, error);
        }

        // Show batch initiation progress
        toast({
          title: 'Batches initiated',
          description: `${percentInitiated}% of batches started (${i + 1}/${batches.length})...`,
        });

        // Small delay between batch initiations to avoid overwhelming the API
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Poll for all results
      await pollForEnrichmentResults(leadIdsToCheck);

    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment failed',
        description: error instanceof Error ? error.message : 'Failed to enrich leads.',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAnalyzeLeads = async (skipEnrichmentPrompt = false) => {
    // Check if leads have enrichment data
    const hasEnrichment = leads.some(l => l.mqlEnrichment?.enrichedAt);
    
    if (!hasEnrichment && !skipEnrichmentPrompt) {
      setShowEnrichPrompt(true);
      return;
    }

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

  const handleClearCache = async () => {
    if (!selectedProjectId) {
      toast({
        title: 'No project selected',
        description: 'Please upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsClearingCache(true);
    try {
      // Delete enrichments for this project
      await supabase
        .from('lead_enrichments')
        .delete()
        .eq('project_id', selectedProjectId);
      
      // Delete analyses for this project
      await supabase
        .from('lead_analyses')
        .delete()
        .eq('project_id', selectedProjectId);
      
      // Delete leads for this project
      await supabase
        .from('leads')
        .delete()
        .eq('project_id', selectedProjectId);

      // Reset UI state
      handleReset();
      setShowClearCacheConfirm(false);
      
      toast({
        title: 'Cache cleared',
        description: 'All lead data for this project has been cleared.',
      });
    } catch (error) {
      console.error('Clear cache error:', error);
      toast({
        title: 'Error clearing cache',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsClearingCache(false);
    }
  };

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
          <h1 className="text-4xl font-bold mb-2">Customer360</h1>
          <p className="text-sm text-muted-foreground mb-4">Powered by Raisn.ai</p>
          <p className="text-lg text-muted-foreground">
            Upload your CRM file to analyze and rate your customer visits
          </p>
        </div>

        {leads.length === 0 ? (
          <UploadWizard onFileSelect={handleFileSelect} isLoading={isLoading} />
        ) : (
          <div className="space-y-8">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button 
                onClick={handleEnrichLeads} 
                disabled={isEnriching || isAnalyzing} 
                size="lg"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                <Database className="mr-2 h-5 w-5" />
                {isEnriching ? 'Enriching...' : 'Enrich with Data'}
              </Button>
              <Button 
                onClick={() => handleAnalyzeLeads()} 
                disabled={isAnalyzing || isEnriching} 
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
              <div className="flex-1" />
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
              userEmail={user?.email}
              onClearCache={() => setShowClearCacheConfirm(true)}
              isClearingCache={isClearingCache}
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

      {/* Enrichment Prompt Dialog */}
      <AlertDialog open={showEnrichPrompt} onOpenChange={setShowEnrichPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enrich leads with external data?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to enrich leads with external data first? This provides credit scores, employment details, and banking information for more accurate analysis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowEnrichPrompt(false);
              handleAnalyzeLeads(true);
            }}>
              Skip & Analyze
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowEnrichPrompt(false);
              handleEnrichLeads();
            }}>
              Enrich First
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Confirmation Dialog */}
      <AlertDialog open={showClearCacheConfirm} onOpenChange={setShowClearCacheConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all cached data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all CRM data, MQL enrichments, and AI analyses for this project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearCache}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingCache ? 'Clearing...' : 'Clear Cache'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
