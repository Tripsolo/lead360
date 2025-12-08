-- Allow approved domain users to delete leads
CREATE POLICY "Approved domain users can delete leads"
ON public.leads
FOR DELETE
USING (is_approved_domain_user());

-- Allow approved domain users to delete lead analyses
CREATE POLICY "Approved domain users can delete analyses"
ON public.lead_analyses
FOR DELETE
USING (is_approved_domain_user());

-- Allow approved domain users to delete enrichments
CREATE POLICY "Approved domain users can delete enrichments"
ON public.lead_enrichments
FOR DELETE
USING (is_approved_domain_user());