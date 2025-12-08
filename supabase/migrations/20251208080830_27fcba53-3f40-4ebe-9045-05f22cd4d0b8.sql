-- Add new columns to lead_enrichments table for enhanced MQL data
ALTER TABLE public.lead_enrichments
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS turnover_slab text,
ADD COLUMN IF NOT EXISTS pre_tax_income_lacs numeric,
ADD COLUMN IF NOT EXISTS active_emi_burden numeric,
ADD COLUMN IF NOT EXISTS emi_to_income_ratio numeric,
ADD COLUMN IF NOT EXISTS home_loan_count integer,
ADD COLUMN IF NOT EXISTS home_loan_active integer,
ADD COLUMN IF NOT EXISTS home_loan_paid_off integer,
ADD COLUMN IF NOT EXISTS auto_loan_count integer,
ADD COLUMN IF NOT EXISTS consumer_loan_count integer,
ADD COLUMN IF NOT EXISTS guarantor_loan_count integer,
ADD COLUMN IF NOT EXISTS credit_card_count integer,
ADD COLUMN IF NOT EXISTS has_premium_cards boolean,
ADD COLUMN IF NOT EXISTS latest_home_loan_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS credit_behavior_signal text;