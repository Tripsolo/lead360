
ALTER TABLE public.lead_enrichments
  ADD COLUMN IF NOT EXISTS rto_vehicle_count integer,
  ADD COLUMN IF NOT EXISTS rto_vehicle_value numeric,
  ADD COLUMN IF NOT EXISTS rto_pre_tax_income numeric,
  ADD COLUMN IF NOT EXISTS rto_lifestyle text,
  ADD COLUMN IF NOT EXISTS rto_vehicle_details jsonb;
