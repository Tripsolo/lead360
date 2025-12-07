-- Add new MQL fields to lead_enrichments table
ALTER TABLE lead_enrichments
ADD COLUMN IF NOT EXISTS final_income_lacs numeric,
ADD COLUMN IF NOT EXISTS locality_grade text,
ADD COLUMN IF NOT EXISTS lifestyle text;