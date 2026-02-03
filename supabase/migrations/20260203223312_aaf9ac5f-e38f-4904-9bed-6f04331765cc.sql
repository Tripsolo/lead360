-- Create tower_inventory table for unit-level inventory with closing prices
CREATE TABLE public.tower_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tower TEXT NOT NULL,
  floors INTEGER,
  units_per_floor INTEGER,
  current_due_pct NUMERIC,
  construction_status TEXT,
  oc_date DATE,
  typology TEXT NOT NULL,
  car_parking TEXT,
  carpet_sqft_min INTEGER,
  carpet_sqft_max INTEGER,
  total_inventory INTEGER,
  sold INTEGER,
  unsold INTEGER,
  gcp_view_units INTEGER,
  view_type TEXT,
  sourcing_min_cr NUMERIC,
  sourcing_max_cr NUMERIC,
  closing_min_cr NUMERIC,
  closing_max_cr NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitor_pricing table for configuration-wise competitor data
CREATE TABLE public.competitor_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  config TEXT NOT NULL,
  carpet_sqft_min INTEGER,
  carpet_sqft_max INTEGER,
  price_min_av NUMERIC,
  price_max_av NUMERIC,
  avg_psf NUMERIC,
  payment_plans TEXT,
  vs_eternia TEXT,
  availability TEXT,
  sample_flat BOOLEAN DEFAULT false,
  last_updated DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.tower_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for tower_inventory
CREATE POLICY "Approved domain users can read tower_inventory"
ON public.tower_inventory
FOR SELECT
USING (is_approved_domain_user());

CREATE POLICY "Approved domain users can insert tower_inventory"
ON public.tower_inventory
FOR INSERT
WITH CHECK (is_approved_domain_user());

CREATE POLICY "Approved domain users can update tower_inventory"
ON public.tower_inventory
FOR UPDATE
USING (is_approved_domain_user())
WITH CHECK (is_approved_domain_user());

CREATE POLICY "Approved domain users can delete tower_inventory"
ON public.tower_inventory
FOR DELETE
USING (is_approved_domain_user());

-- RLS policies for competitor_pricing
CREATE POLICY "Approved domain users can read competitor_pricing"
ON public.competitor_pricing
FOR SELECT
USING (is_approved_domain_user());

CREATE POLICY "Approved domain users can insert competitor_pricing"
ON public.competitor_pricing
FOR INSERT
WITH CHECK (is_approved_domain_user());

CREATE POLICY "Approved domain users can update competitor_pricing"
ON public.competitor_pricing
FOR UPDATE
USING (is_approved_domain_user())
WITH CHECK (is_approved_domain_user());

CREATE POLICY "Approved domain users can delete competitor_pricing"
ON public.competitor_pricing
FOR DELETE
USING (is_approved_domain_user());

-- Create indexes for efficient querying
CREATE INDEX idx_tower_inventory_project_id ON public.tower_inventory(project_id);
CREATE INDEX idx_tower_inventory_typology ON public.tower_inventory(typology);
CREATE INDEX idx_tower_inventory_tower ON public.tower_inventory(tower);
CREATE INDEX idx_competitor_pricing_project ON public.competitor_pricing(project_name);
CREATE INDEX idx_competitor_pricing_config ON public.competitor_pricing(config);

-- Create trigger for updated_at on tower_inventory
CREATE TRIGGER update_tower_inventory_updated_at
BEFORE UPDATE ON public.tower_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();