-- Create lead_enrichments table to store MQL API responses
CREATE TABLE public.lead_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  project_id TEXT,
  enriched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mql_rating TEXT,
  mql_capability TEXT,
  mql_lifestyle TEXT,
  credit_score INTEGER,
  age INTEGER,
  gender TEXT,
  location TEXT,
  employer_name TEXT,
  designation TEXT,
  total_loans INTEGER,
  active_loans INTEGER,
  home_loans INTEGER,
  auto_loans INTEGER,
  highest_card_usage_percent NUMERIC,
  is_amex_holder BOOLEAN,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, project_id)
);

-- Enable RLS
ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for domain-based access
CREATE POLICY "Approved domain users can read enrichments"
ON public.lead_enrichments
FOR SELECT
USING (is_approved_domain_user());

CREATE POLICY "Approved domain users can insert enrichments"
ON public.lead_enrichments
FOR INSERT
WITH CHECK (is_approved_domain_user());

CREATE POLICY "Approved domain users can update enrichments"
ON public.lead_enrichments
FOR UPDATE
USING (is_approved_domain_user())
WITH CHECK (is_approved_domain_user());

-- Add trigger for updated_at
CREATE TRIGGER update_lead_enrichments_updated_at
BEFORE UPDATE ON public.lead_enrichments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();