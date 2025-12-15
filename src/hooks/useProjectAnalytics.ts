import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ManagerStats {
  name: string;
  total: number;
  hot: number;
  warm: number;
  cold: number;
  upgradePercentage: number;
}

interface SourceStats {
  subSource: string;
  total: number;
  hot: number;
  warm: number;
  cold: number;
  upgradePercentage: number;
}

interface ConcernStats {
  concernType: string;
  leadCount: number;
  percentage: number;
  dominantPersona: string;
  dominantProfession: string;
}

interface ProjectAnalyticsData {
  totalLeads: number;
  analyzedLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  upgradePercentage: number;
  managerPerformance: ManagerStats[];
  sourcePerformance: SourceStats[];
  concernAnalysis: ConcernStats[];
}

interface LeadWithAnalysis {
  lead_id: string;
  project_id: string | null;
  crm_data: Record<string, unknown>;
  lead_analyses: Array<{
    rating: string;
    analyzed_at: string;
    full_analysis: Record<string, unknown> | null;
  }>;
}

const RATING_VALUE: Record<string, number> = {
  'Hot': 3,
  'Warm': 2,
  'Cold': 1
};

const isUpgraded = (manualRating: string | null | undefined, aiRating: string | null | undefined): boolean => {
  if (!manualRating || !aiRating) return false;
  const manual = RATING_VALUE[manualRating] || 0;
  const ai = RATING_VALUE[aiRating] || 0;
  return ai > manual;
};

export function useProjectAnalytics(selectedProjectId: string | null) {
  const [leads, setLeads] = useState<LeadWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // First fetch all analyses (only AI-rated leads)
        let analysesQuery = supabase
          .from('lead_analyses')
          .select('lead_id, project_id, rating, analyzed_at, full_analysis');
        
        if (selectedProjectId && selectedProjectId !== 'all') {
          analysesQuery = analysesQuery.eq('project_id', selectedProjectId);
        }

        const { data: analysesData, error: analysesError } = await analysesQuery;
        if (analysesError) throw analysesError;

        if (!analysesData || analysesData.length === 0) {
          setLeads([]);
          setLoading(false);
          return;
        }

        // Get unique lead IDs from analyses
        const leadIds = [...new Set(analysesData.map(a => a.lead_id))];

        // Fetch only leads that have AI analyses
        const { data: leadsData, error: leadsError } = await supabase
          .from('leads')
          .select('lead_id, project_id, crm_data')
          .in('lead_id', leadIds);
        if (leadsError) throw leadsError;

        // Map analyses to leads
        const analysesMap = new Map<string, Array<{ rating: string; analyzed_at: string; full_analysis: Record<string, unknown> | null }>>();
        (analysesData || []).forEach((analysis) => {
          const key = analysis.lead_id;
          if (!analysesMap.has(key)) {
            analysesMap.set(key, []);
          }
          analysesMap.get(key)!.push({
            rating: analysis.rating,
            analyzed_at: analysis.analyzed_at,
            full_analysis: analysis.full_analysis as Record<string, unknown> | null
          });
        });

        const combinedData: LeadWithAnalysis[] = (leadsData || []).map((lead) => ({
          lead_id: lead.lead_id,
          project_id: lead.project_id,
          crm_data: lead.crm_data as Record<string, unknown>,
          lead_analyses: analysesMap.get(lead.lead_id) || []
        }));

        setLeads(combinedData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProjectId]);

  const analytics = useMemo((): ProjectAnalyticsData => {
    // All leads in the list are already AI-rated (filtered at fetch time)
    let hotLeads = 0;
    let warmLeads = 0;
    let coldLeads = 0;
    let upgradedCount = 0;

    const managerMap = new Map<string, { total: number; hot: number; warm: number; cold: number; upgraded: number }>();
    const sourceMap = new Map<string, { total: number; hot: number; warm: number; cold: number; upgraded: number }>();
    const concernMap = new Map<string, { 
      count: number; 
      personas: Map<string, number>; 
      professions: Map<string, number>;
    }>();

    leads.forEach(lead => {
      const latestAnalysis = lead.lead_analyses.sort(
        (a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime()
      )[0];
      
      const aiRating = latestAnalysis?.rating;
      const manualRating = lead.crm_data?.['Walkin Manual Rating'] as string | undefined;
      const managerName = (lead.crm_data?.['Name of Closing Manager'] as string) || 'Unknown';
      const subSource = (lead.crm_data?.['Sales Walkin Sub Source'] as string) || 'Unknown';
      const sourceKey = subSource;
      
      // Extract concern, persona, and profession from full_analysis
      const fullAnalysis = latestAnalysis?.full_analysis;
      const primaryConcern = (fullAnalysis?.primary_concern_category as string) || null;
      const persona = (fullAnalysis?.persona as string) || 'Unknown';
      const profession = (lead.crm_data?.['Occupation'] as string) || 'Unknown';

      // Count by AI rating
      if (aiRating === 'Hot') hotLeads++;
      else if (aiRating === 'Warm') warmLeads++;
      else if (aiRating === 'Cold') coldLeads++;

      // Check if upgraded
      const upgraded = isUpgraded(manualRating, aiRating);
      if (upgraded) upgradedCount++;

      // Manager stats
      if (!managerMap.has(managerName)) {
        managerMap.set(managerName, { total: 0, hot: 0, warm: 0, cold: 0, upgraded: 0 });
      }
      const managerStats = managerMap.get(managerName)!;
      managerStats.total++;
      if (aiRating === 'Hot') managerStats.hot++;
      else if (aiRating === 'Warm') managerStats.warm++;
      else if (aiRating === 'Cold') managerStats.cold++;
      if (upgraded) managerStats.upgraded++;

      // Source stats
      if (!sourceMap.has(sourceKey)) {
        sourceMap.set(sourceKey, { total: 0, hot: 0, warm: 0, cold: 0, upgraded: 0 });
      }
      const sourceStats = sourceMap.get(sourceKey)!;
      sourceStats.total++;
      if (aiRating === 'Hot') sourceStats.hot++;
      else if (aiRating === 'Warm') sourceStats.warm++;
      else if (aiRating === 'Cold') sourceStats.cold++;
      if (upgraded) sourceStats.upgraded++;

      // Concern stats
      if (primaryConcern) {
        if (!concernMap.has(primaryConcern)) {
          concernMap.set(primaryConcern, { 
            count: 0, 
            personas: new Map(), 
            professions: new Map() 
          });
        }
        const concernStats = concernMap.get(primaryConcern)!;
        concernStats.count++;
        concernStats.personas.set(persona, (concernStats.personas.get(persona) || 0) + 1);
        concernStats.professions.set(profession, (concernStats.professions.get(profession) || 0) + 1);
      }
    });

    const managerPerformance: ManagerStats[] = Array.from(managerMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        hot: stats.hot,
        warm: stats.warm,
        cold: stats.cold,
        upgradePercentage: stats.total > 0 ? Math.round((stats.upgraded / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    const sourcePerformance: SourceStats[] = Array.from(sourceMap.entries())
      .map(([subSource, stats]) => ({
        subSource,
        total: stats.total,
        hot: stats.hot,
        warm: stats.warm,
        cold: stats.cold,
        upgradePercentage: stats.total > 0 ? Math.round((stats.upgraded / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate concern analysis
    const totalLeadsWithConcerns = Array.from(concernMap.values()).reduce((sum, c) => sum + c.count, 0);
    const concernAnalysis: ConcernStats[] = Array.from(concernMap.entries())
      .map(([concernType, stats]) => {
        // Find dominant persona
        let dominantPersona = 'Unknown';
        let maxPersonaCount = 0;
        stats.personas.forEach((count, persona) => {
          if (count > maxPersonaCount) {
            maxPersonaCount = count;
            dominantPersona = persona;
          }
        });

        // Find dominant profession
        let dominantProfession = 'Unknown';
        let maxProfessionCount = 0;
        stats.professions.forEach((count, profession) => {
          if (count > maxProfessionCount) {
            maxProfessionCount = count;
            dominantProfession = profession;
          }
        });

        return {
          concernType,
          leadCount: stats.count,
          percentage: totalLeadsWithConcerns > 0 ? Math.round((stats.count / totalLeadsWithConcerns) * 100) : 0,
          dominantPersona,
          dominantProfession
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return {
      totalLeads: leads.length,
      analyzedLeads: leads.length, // All leads are AI-rated
      hotLeads,
      warmLeads,
      coldLeads,
      upgradePercentage: leads.length > 0 ? Math.round((upgradedCount / leads.length) * 100) : 0,
      managerPerformance,
      sourcePerformance,
      concernAnalysis
    };
  }, [leads]);

  return { analytics, loading, error };
}
