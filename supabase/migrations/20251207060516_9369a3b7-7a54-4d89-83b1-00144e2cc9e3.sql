-- Drop the overly permissive read policy on approved_domains
DROP POLICY IF EXISTS "Authenticated users can read approved domains" ON public.approved_domains;

-- No replacement policy needed - the is_approved_domain_user() function 
-- uses SECURITY DEFINER so it bypasses RLS and can still query this table