-- Create sister_projects table for cross-selling opportunities
CREATE TABLE public.sister_projects (
  id text NOT NULL PRIMARY KEY,
  parent_project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand_id text NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'township_sister',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  cross_sell_triggers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add constraint for relationship_type
ALTER TABLE public.sister_projects 
ADD CONSTRAINT sister_projects_relationship_type_check 
CHECK (relationship_type IN ('township_sister', 'adjacent', 'same_developer'));

-- Enable Row Level Security
ALTER TABLE public.sister_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for read access (same as other tables)
CREATE POLICY "Approved domain users can read sister_projects" 
ON public.sister_projects 
FOR SELECT 
USING (is_approved_domain_user());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sister_projects_updated_at
BEFORE UPDATE ON public.sister_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries by parent project
CREATE INDEX idx_sister_projects_parent ON public.sister_projects(parent_project_id);
CREATE INDEX idx_sister_projects_brand ON public.sister_projects(brand_id);