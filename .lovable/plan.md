

# Display TP-IDs in UI + Add Business Owner Persona Matrix

## Summary

Two changes are needed:
1. **UI Update**: Show the TP-ID alongside each talking point in the Lead Report Modal
2. **Framework Update**: Add a dedicated "Business Owner" persona to the NBA framework with full matrix entries

---

## Change 1: Display TP-IDs in Talking Points Section

### Current Behavior
The database stores complete talking point data including `tp_id`:
```json
{
  "tp_id": "TP-ECO-007",
  "type": "Objection handling",
  "point": "A 2-floor lower unit saves ₹4-6L..."
}
```

But the UI only shows `type` and `point`, not the `tp_id`.

### Technical Fix

**File:** `src/components/LeadReportModal.tsx`

**Lines 431-443:** Update to display TP-ID as a code badge:

```typescript
{analysis.talking_points.map((item, idx) => (
  <li key={idx} className="text-sm flex flex-col gap-1.5">
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
        item.type === 'Competitor handling' 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          : item.type === 'Objection handling'
          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      }`}>
        {item.type}
      </span>
      {item.tp_id && (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-muted-foreground">
          {item.tp_id}
        </code>
      )}
    </div>
    <span className="leading-relaxed">{item.point}</span>
  </li>
))}
```

---

## Change 2: Add Business Owner Persona Matrix

### Context from Framework

Per the Excel framework (Page 3), Business Owners appear across multiple personas:
- **Lifestyle Connoisseur**: "CXO, VP, Director, Business Owner. Age 35-50. Status-conscious, quality-focused."
- **Vastu-Rigid Buyer**: "Business owner, Traditional family, Gujarati/Marwari community common."
- **Pragmatic Investor**: "Doctor, CA, Business owner, HNI investor."

### Proposed Business Owner Profile

Based on the framework characteristics:
- **Income Range**: 30-100+ LPA (spans Lifestyle Connoisseur to Pragmatic Investor)
- **Budget Range**: 1.5-3.5 Cr
- **Key Traits**: Decision authority, cash flexibility, quality-focused, time-conscious
- **Top Objections**: Price justification, timeline vs opportunity cost, ROI expectations

### Technical Fix

**File:** `supabase/functions/analyze-leads/nba-framework.ts`

**Add to `normalizePersona()` function (after line 1376):**

```typescript
// Business Owner - dedicated handling (not mapped to other personas)
if (personaLower.includes("business") && personaLower.includes("owner")) {
  return "Business Owner";
}
```

**Add to `PersonaId` type (line 23):**

```typescript
| "Business Owner"
```

**Add to `PERSONA_OBJECTION_MATRIX` (after line 1227, after Pragmatic Investor):**

```typescript
"Business Owner": {
  "Budget Gap (<15%)": { nba_id: "NBA-OFF-001", tp_ids: ["TP-ECO-007", "TP-ECO-003"], action_summary: "Floor adjustment + value proposition" },
  "Budget Gap (>15%)": { nba_id: "NBA-OFF-002", tp_ids: ["TP-ECO-006", "TP-ECO-008"], action_summary: "Payment restructuring for cash flow" },
  "SOP Required": { nba_id: "NBA-OFF-003", tp_ids: ["TP-ECO-010"], action_summary: "Conditional with business flexibility" },
  "Loan Eligibility Issue": { nba_id: "NBA-ESC-003", tp_ids: ["TP-ECO-009"], action_summary: "Often cash-rich, explore alternatives" },
  "RTMI Need (Urgent 75+)": { nba_id: "NBA-ESC-004", tp_ids: ["TP-SPEC-005"], action_summary: "Immediate resale pivot" },
  "Timeline Concern (General)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-003", "TP-POS-001"], action_summary: "Progress + opportunity cost" },
  "Delay Fear (Immensa History)": { nba_id: "NBA-COL-002", tp_ids: ["TP-POS-004"], action_summary: "Track record reassurance" },
  "Rooms Feel Small": { nba_id: "NBA-COL-003", tp_ids: ["TP-INV-001"], action_summary: "Efficiency + Jodi option" },
  "Vastu Non-Compliance": { nba_id: "NBA-OFF-006", tp_ids: ["TP-INV-004"], action_summary: "Show compliant premium options" },
  "View/Privacy Concern": { nba_id: "NBA-COL-004", tp_ids: ["TP-INV-003"], action_summary: "GCP premium justification" },
  "Price Lower at Competitor": { nba_id: "NBA-COL-001", tp_ids: ["TP-COMP-003", "TP-ECO-003"], action_summary: "Quality + lifestyle differentiation" },
  "Competitor Location Better": { nba_id: "NBA-COL-001", tp_ids: ["TP-LOC-003"], action_summary: "Growth potential + infrastructure" },
  "Multiple Decision Makers": { nba_id: "NBA-COM-004", tp_ids: ["TP-DEC-001"], action_summary: "Quick senior connect" },
  "Just Started Exploring": { nba_id: "NBA-FUP-001", tp_ids: ["TP-DEC-002", "TP-ECO-003"], action_summary: "Time-efficient education" },
},
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/LeadReportModal.tsx` | Add TP-ID display as code badge next to type |
| `supabase/functions/analyze-leads/nba-framework.ts` | Add "Business Owner" to PersonaId type, normalizePersona(), and PERSONA_OBJECTION_MATRIX |

---

## Expected Outcome

After implementation:
1. **UI**: Each talking point will show its TP-ID (e.g., `TP-ECO-007`) as a monospace code badge
2. **Framework**: "Business Owner" persona will have dedicated matrix entries with tailored TP combinations
3. **Re-analysis**: Business Owner leads will get persona-specific recommendations instead of falling back to "Aspirant Upgrader"

---

## Visual Preview

Talking Points section will display:

```text
┌────────────────────────────────────────────────────────────────┐
│ 💡 Talking Points                                              │
├────────────────────────────────────────────────────────────────┤
│ [Objection handling] [TP-ECO-007]                              │
│ A 2-floor lower unit saves ₹4-6L, absorbing price deviations   │
│ without compromising on your business-class lifestyle.         │
│                                                                │
│ [Competitor handling] [TP-COMP-003]                            │
│ Competitors offer lower prices but higher maintenance; our     │
│ Geberit fittings ensure 25 years of worry-free premium living. │
└────────────────────────────────────────────────────────────────┘
```

