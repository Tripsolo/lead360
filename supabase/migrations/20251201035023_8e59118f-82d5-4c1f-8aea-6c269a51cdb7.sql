-- Create leads table to store raw CRM data
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id),
  crm_data JSONB NOT NULL,
  latest_revisit_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, project_id)
);

-- Create lead_analyses table to store AI analysis results
CREATE TABLE public.lead_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  project_id TEXT REFERENCES public.projects(id),
  rating TEXT NOT NULL,
  insights TEXT,
  full_analysis JSONB,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisit_date_at_analysis TIMESTAMPTZ,
  UNIQUE(lead_id, project_id)
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to leads"
ON public.leads
FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to lead_analyses"
ON public.lead_analyses
FOR SELECT
USING (true);

-- Create trigger for automatic timestamp updates on leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_leads_lead_id_project_id ON public.leads(lead_id, project_id);
CREATE INDEX idx_lead_analyses_lead_id_project_id ON public.lead_analyses(lead_id, project_id);