

# Plan: Add Budget Standardization Validation Rule 11 to Evaluator

## Change Required

### File: `supabase/functions/analyze-leads/evaluator.ts`

**Location**: After Rule 10 (line 294), before the closing backtick

**Add the following text**:
```text

### Rule 11: Budget Standardization Validation 
**VALIDATION RULES:**
- If budget_stated >= 10 AND <= 100 → WARNING: Likely in Lakhs, should be divided by 100
- VALID range: ₹30 Lac to ₹20 Cr - typical residential budget)
- null or 0: WARNING - No budget extracted from CRM comments

**EXPECTED STANDARDIZED FORMAT:**
- ₹82.5 Lacs → budget_stated_cr: 0.825 (display as "₹ 82.5 Lacs")
- ₹1.25 Cr → budget_stated_cr: 1.25 (display as "₹ 1.25 Cr")
- ₹2 Cr → budget_stated_cr: 2.0 (display as "₹ 2.00 Cr")
```

This adds Rule 11 directly after Rule 10 (PPS Score Exclusion) in the evaluator's CRITICAL RULES section, with no other changes to the file.

