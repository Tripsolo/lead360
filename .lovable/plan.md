

# Plan: Standardize Budget Extraction to Crore Format

## Problem Identified

The current Stage 1 extraction does not have explicit rules for parsing budget values from varied manager input formats. Managers write budgets inconsistently:

**Variations observed:**
- `"1.5Cr"`, `"1.5 Crore"`, `"1.5 cr"`, `"150 lacs"`, `"150 Lakhs"`, `"150L"`, `"1,50,00,000"`
- Some leads have `budget_stated = 11000000` (raw rupees)
- Others have `budget_stated = 1.25` (already in crores)

**Current State in Database:**
| Lead ID | budget_stated |
|---------|--------------|
| 006fv000004Nfue | 1.25 |
| 006fv000004Mlu3 | 11000000 ← Raw rupees (should be 1.10 Cr) |
| 006fv000004MEtJ | 0.825 |

**Desired Output Format:**
- If budget < 1 Cr → Display as `"XY Lacs"` (e.g., `"82.5 Lacs"`)
- If budget ≥ 1 Cr → Display as `"X.YY Cr"` (e.g., `"1.25 Cr"`)

---

## Solution Architecture

### Two-Layer Standardization:

```text
Layer 1: Stage 1 Extraction (LLM)
├── Parse all budget format variations from visit comments
├── Convert to standardized Crores format (number)
└── Return: budget_stated_cr as decimal (e.g., 1.25 for ₹1.25Cr, 0.825 for ₹82.5L)

Layer 2: UI Display Formatting (Frontend)
├── If value < 1: Display as "XY Lacs" format
└── If value >= 1: Display as "X.YY Cr" format
```

---

## Changes Required

### File 1: `supabase/functions/analyze-leads/index.ts`

**Location**: Stage 1 prompt - Add explicit budget parsing rules (after line 73)

**Add new section to `FIELD EXTRACTION RULES`:**

```text
### Budget Parsing (CRITICAL - STANDARDIZATION REQUIRED):
Parse budget from visit comments and ALWAYS convert to Crores as a decimal number.

## PARSING PATTERNS (All must be converted to Crore decimal):

| Input Pattern | Interpretation | Output (budget_stated_cr) |
|--------------|----------------|--------------------------|
| "1.5Cr", "1.5 Crore", "1.5 cr", "1.5CR" | 1.5 Crores | 1.5 |
| "150 lacs", "150 lakhs", "150L", "150 lac" | 150 Lakhs | 1.5 |
| "1,50,00,000", "15000000" | 1.5 Crore rupees | 1.5 |
| "82 lacs", "82L", "82 lakhs" | 82 Lakhs | 0.82 |
| "85-90 lacs" | Range: take midpoint (87.5L) | 0.875 |
| "1-1.2 Cr" | Range: take midpoint (1.1 Cr) | 1.1 |
| "1.3 to 1.5 cr" | Range: take midpoint | 1.4 |
| "around 2Cr", "approx 2 crore" | 2 Crores | 2.0 |
| "budget 2" (context shows Cr) | 2 Crores (assume Cr if >0 and <10) | 2.0 |
| "budget 150" (context shows L) | 150 Lakhs (assume L if 10-999) | 1.5 |

## CONVERSION RULES:
1. ALWAYS output budget_stated_cr in CRORES as a decimal number
2. 1 Crore = 100 Lakhs = 10,000,000 rupees
3. To convert Lakhs to Crores: divide by 100 (e.g., 150L → 1.5Cr)
4. To convert raw rupees to Crores: divide by 10,000,000
5. For ranges, use the midpoint value
6. For ambiguous numbers (just "2" or "150"):
   - If 0-10: Assume Crores (e.g., "2" → 2.0 Cr)
   - If 10-999: Assume Lakhs (e.g., "150" → 1.5 Cr)
   - If 1000+: Assume raw rupees (e.g., "15000000" → 1.5 Cr)

## EXAMPLES FROM REAL CRM COMMENTS:
- "budget is 1.2-1.3 Cr" → 1.25
- "looking in 90 lacs range" → 0.9
- "can stretch to 1.5 cr max" → 1.5
- "budget around 1,30,00,000" → 1.3
- "80-90 L budget" → 0.85
- "2 crore budget" → 2.0
- "budget 1.75" → 1.75 (assume Cr since <10)
```

---

### File 2: Update UI Formatting (Frontend)

**Location**: `src/components/LeadReportModal.tsx` - Update `formatBudget` function (line 17-31)

**New Logic:**
```typescript
const formatBudget = (value: number | string | null | undefined): string => {
  if (value == null || value === '' || value === 0) return 'No data available';
  
  let numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return 'No data available';
  
  // Handle raw rupee values (>100 means it's in rupees, not crores)
  if (numValue >= 100) {
    numValue = numValue / 10000000; // Convert to crores
  }
  
  // Format based on value
  if (numValue < 1) {
    // Less than 1 Cr: Display in Lacs format
    const lacsValue = numValue * 100;
    return `₹ ${lacsValue.toFixed(1)} Lacs`;
  } else {
    // 1 Cr or more: Display in Cr format
    return `₹ ${numValue.toFixed(2)} Cr`;
  }
};
```

---

### File 3: Update LeadCard.tsx Formatting

**Location**: `src/components/LeadCard.tsx` (line 197)

**Current:**
```typescript
<span className="font-medium">Budget:</span> ₹{(analysis.extracted_signals.budget_stated / 10000000).toFixed(2)}Cr
```

**Updated:**
Use the same formatting logic as LeadReportModal (create a shared utility or inline the logic).

---

### File 4: Update Derived Fields Export

**Location**: `src/utils/derivedFieldsExport.ts`

Ensure `budget_stated_cr` in the export uses the same standardized display format.

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `index.ts` | Stage 1 prompt (line ~73) | Add detailed budget parsing rules with pattern matching |
| `LeadReportModal.tsx` | `formatBudget` function (line 17-31) | Smart formatting: <1Cr shows Lacs, ≥1Cr shows Cr |
| `LeadCard.tsx` | Line 197 | Use consistent formatting function |
| `derivedFieldsExport.ts` | Budget display logic | Apply same formatting rules |

---

## Expected Outcome

**Stage 1 Extraction:**
- `"budget 82 lacs"` → `budget_stated_cr: 0.82`
- `"1.5 Crore budget"` → `budget_stated_cr: 1.5`
- `"15000000"` → `budget_stated_cr: 1.5`

**UI Display:**
- `0.82` → `"₹ 82.0 Lacs"`
- `1.5` → `"₹ 1.50 Cr"`
- `0.75` → `"₹ 75.0 Lacs"`
- `2.25` → `"₹ 2.25 Cr"`

This ensures consistent budget representation regardless of how managers write it in comments.

