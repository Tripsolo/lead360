-- Create approved_domains table to store allowed email domains
CREATE TABLE public.approved_domains (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on approved_domains
ALTER TABLE public.approved_domains ENABLE ROW LEVEL SECURITY;

-- Only authenticated users from approved domains can read approved_domains
CREATE POLICY "Authenticated users can read approved domains"
ON public.approved_domains
FOR SELECT
TO authenticated
USING (true);

-- Insert initial approved domains
INSERT INTO public.approved_domains (domain) VALUES 
    ('raisn.ai'),
    ('kalpataru.com');

-- Create a security definer function to check if user email is from approved domain
CREATE OR REPLACE FUNCTION public.is_approved_domain_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.approved_domains ad
        WHERE (SELECT split_part(email, '@', 2) FROM auth.users WHERE id = auth.uid()) = ad.domain
    )
$$;

-- Drop existing RLS policies on leads table
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

-- Create new RLS policies for leads that check approved domain
CREATE POLICY "Approved domain users can read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_approved_domain_user());

CREATE POLICY "Approved domain users can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.is_approved_domain_user());

CREATE POLICY "Approved domain users can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.is_approved_domain_user())
WITH CHECK (public.is_approved_domain_user());

-- Drop existing RLS policies on lead_analyses table
DROP POLICY IF EXISTS "Authenticated users can read analyses" ON public.lead_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert analyses" ON public.lead_analyses;

-- Create new RLS policies for lead_analyses that check approved domain
CREATE POLICY "Approved domain users can read analyses"
ON public.lead_analyses
FOR SELECT
TO authenticated
USING (public.is_approved_domain_user());

CREATE POLICY "Approved domain users can insert analyses"
ON public.lead_analyses
FOR INSERT
TO authenticated
WITH CHECK (public.is_approved_domain_user());

-- Drop existing RLS policies on brands table
DROP POLICY IF EXISTS "Authenticated users can read brands" ON public.brands;

-- Create new RLS policy for brands that checks approved domain
CREATE POLICY "Approved domain users can read brands"
ON public.brands
FOR SELECT
TO authenticated
USING (public.is_approved_domain_user());

-- Drop existing RLS policies on projects table
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;

-- Create new RLS policy for projects that checks approved domain
CREATE POLICY "Approved domain users can read projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_approved_domain_user());