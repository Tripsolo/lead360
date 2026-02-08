
# Plan: Add Explicit PPS Score Exclusion Rule to Stage 2 and Evaluator

## Problem Identified

The current Stage 2 prompt has a **contradiction**:
- Line 2228 says: `Rating rationale should start with "**PPS Score: X/100.**"`
- Line 2339 says: `Do NOT include the PPS score value - it is displayed separately`

This inconsistency needs to be resolved, and an explicit non-negotiable rule must be added to both Stage 2 and the Stage 4 Evaluator.

---

## Changes Required

### File 1: `supabase/functions/analyze-leads/index.ts`

**Location**: Stage 2 prompt - `outputConstraints` section (around line 2227-2230)

**Current Code**:
```typescript
const outputConstraints = `# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):
- Rating rationale should start with "**PPS Score: X/100.**" in bold, followed by key scoring factors. Do NOT include rating label like "(Hot)" or "(Warm)" in the rationale - that's shown separately
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.`;
```

**Updated Code**:
```typescript
const outputConstraints = `# OUTPUT CONSTRAINTS (CRITICAL - STRICTLY ENFORCE):

## PPS SCORE EXCLUSION RULE (NON-NEGOTIABLE - ABSOLUTE REQUIREMENT):
The PPS Score number MUST NEVER appear in the rating_rationale field. This is a non-negotiable rule that must never be broken under any circumstances.
- ❌ NEVER write "PPS Score: X/100" or any variant
- ❌ NEVER mention specific PPS values (e.g., "scored 85", "PPS of 72")
- ❌ NEVER reference the numerical score in any form
- ✅ Focus ONLY on the qualitative factors: financial capability, intent signals, timeline urgency
- The PPS score is calculated internally and displayed separately in the UI - it must NOT appear in text output

This rule is ABSOLUTE. Violations are unacceptable under any circumstances.

## Other Constraints:
- Rating rationale: 2-3 sentences focusing on key scoring factors (capability, intent, urgency). NO PPS numbers.
- Summary: Maximum 30 words. Be concise and focused.
- Next Best Action: Maximum 15 words. Keep it actionable and specific.`;
```

**Also update line 2339** (rating_rationale description in output structure):
```typescript
"rating_rationale": "Brief 2-3 sentence explanation of key scoring factors that determined this lead's rating. Focus on financial capability, intent signals, and timeline urgency. NEVER include the PPS score value - this is a non-negotiable rule.",
```

---

### File 2: `supabase/functions/analyze-leads/evaluator.ts`

**Location**: `buildEvaluatorPrompt` function - add a new Rule 10 to the CRITICAL RULES section (around line 231-286)

**Add after Rule 9 (around line 286)**:
```typescript
### Rule 10: PPS Score Exclusion in Rating Rationale (NON-NEGOTIABLE)
The PPS Score number MUST NEVER appear in any text output field, especially rating_rationale.
- If rating_rationale contains "PPS Score", "PPS: ", "scored X/100", or any numerical PPS reference → REMOVE IT
- This is a non-negotiable rule that must never be broken
- CORRECT: Replace with qualitative description of scoring factors (capability, intent, urgency)
- The PPS score is displayed separately in the UI and must not appear in text fields
```

**Also add to the output structure validation section** (around line 370-438):
```typescript
## PPS SCORE VALIDATION (NON-NEGOTIABLE)
Before returning final_output, verify:
- rating_rationale does NOT contain "PPS Score", "PPS:", or any numerical score reference
- If found, CORRECT by removing the PPS reference and keeping only qualitative factors
- Add to corrections_made array with reason: "PPS score removed from rationale per non-negotiable rule"
```

---

## Summary of Changes

| File | Section | Change |
|------|---------|--------|
| `index.ts` | Line ~2227-2230 | Remove contradictory instruction to include PPS, add explicit exclusion rule |
| `index.ts` | Line ~2339 | Strengthen wording to "NEVER include" with non-negotiable emphasis |
| `evaluator.ts` | Line ~286 | Add Rule 10: PPS Score Exclusion validation |
| `evaluator.ts` | Line ~370 | Add PPS validation check to output structure section |

---

## Expected Outcome

After these changes:
1. Stage 2 will never generate PPS scores in rating_rationale
2. Stage 4 Evaluator will catch and correct any PPS score leaks
3. Both stages have explicit, non-negotiable language ensuring this rule is never violated
4. The corrections_made audit trail will log any PPS score removals
