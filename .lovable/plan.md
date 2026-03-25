

# Comprehensive Excel Export - All Lead Data

## Problem
The current export only includes ~22 fields, missing most MQL enrichment data, detailed AI insights (talking points, NBA details, cross-sell, PPS scores), and several CRM fields.

## Plan

### Update `src/utils/excelExport.ts` to export all available data across 3 sections:

**Sheet 1: Leads Analysis** (single sheet with all columns grouped logically)

#### CRM Fields (existing + missing)
- Lead ID, Name, Phone, Email, Lead Owner, Project Interest, Source, Sub Source, Last Visit, Manager Rating, Unit Interested, Tower Interested, Budget, Timeline, Occupation, Designation, Company, Current Residence, Building Name, Work Location, Preferred Station, Carpet Area, Floor Preference, Facing, Construction Stage, Funding Source, In-Hand Funds

#### MQL Enrichment Fields (all new)
- MQL Rating, MQL Capability, MQL Lifestyle, Credit Score, Age, Gender, Location, Locality Grade, Lifestyle, Final Income (Lacs), Employer Name, Designation (MQL), Total Loans, Active Loans, Home Loans, Auto Loans, Highest Card Usage %, Amex Holder

#### AI Analysis Fields (existing + many new)
- AI Rating, Rating Confidence, Rating Rationale, PPS Score, PPS Breakdown (5 sub-scores), Persona, Persona Description, Summary, Key Concerns (all, joined), Primary Concern Category, All Concern Categories, NBA ID, NBA Action Type, NBA Action, NBA Escalation Trigger, NBA Fallback Action, Talking Points (formatted as numbered list), Objection Categories, Primary Objection, Secondary Objections, Budget Stated, In-Hand Funds (signal), Finalization Timeline, Decision Maker Present, Spot Closure Asked, Sample Feedback, Core Motivation, MQL Credit Rating, Cross-sell Project, Cross-sell Config, Cross-sell Price Range, Cross-sell Reason, Cross-sell Talking Point

### Implementation Details

- Format the `next_best_action` field properly (handle both string and object formats)
- Format `talking_points` array as a numbered multiline string per lead
- Format PPS breakdown sub-scores as individual columns
- Format cross-sell recommendation fields as individual columns
- Update column widths array to match all new columns
- Join array fields (key_concerns, objection_categories) with semicolons

Total columns: ~60+ (comprehensive export of all available data)

