
-- 1) Add Tata AIA brand (MQL calls reuse the kalpataru schema + project name as instructed)
INSERT INTO public.brands (id, name, metadata, excel_schema)
VALUES (
  'tata-aia',
  'Tata AIA',
  '{"mql_schema": "kalpataru"}'::jsonb,
  (SELECT excel_schema FROM public.brands WHERE id = 'kalpataru')
)
ON CONFLICT (id) DO NOTHING;

-- 2) Add Sampoorna Raksha Promise product; override MQL project name to Kalpataru's
INSERT INTO public.projects (id, brand_id, name, metadata)
VALUES (
  'sampoorna-raksha-promise',
  'tata-aia',
  'Sampoorna Raksha Promise',
  '{"mql_project_name": "Kalpataru Parkcity Eternia"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3) user ↔ brand access mapping
CREATE TABLE IF NOT EXISTS public.user_brand_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, brand_id)
);

GRANT SELECT ON public.user_brand_access TO authenticated;
GRANT ALL ON public.user_brand_access TO service_role;

ALTER TABLE public.user_brand_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own brand access"
  ON public.user_brand_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4) Helper to check brand access
CREATE OR REPLACE FUNCTION public.user_has_brand_access(_brand_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_brand_access
    WHERE user_id = auth.uid() AND brand_id = _brand_id
  )
$$;

-- 5) Backfill: give every existing approved-domain user access to Kalpataru
INSERT INTO public.user_brand_access (user_id, brand_id)
SELECT u.id, 'kalpataru'
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.approved_domains ad
  WHERE split_part(u.email, '@', 2) = ad.domain
)
ON CONFLICT DO NOTHING;

-- 6) Tighten brand/project RLS: require both approved domain AND brand access
DROP POLICY IF EXISTS "Approved domain users can read brands" ON public.brands;
CREATE POLICY "Users can read brands they have access to"
  ON public.brands FOR SELECT
  TO authenticated
  USING (is_approved_domain_user() AND user_has_brand_access(id));

DROP POLICY IF EXISTS "Approved domain users can read projects" ON public.projects;
CREATE POLICY "Users can read projects for accessible brands"
  ON public.projects FOR SELECT
  TO authenticated
  USING (is_approved_domain_user() AND user_has_brand_access(brand_id));
