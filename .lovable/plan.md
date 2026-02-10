
# Plan: Update Safety Override Section in Scenario Variant

## Summary

Update the safety override text in `nba-scenario-framework.ts` (lines 306-317) to add budget-aware logic for RTMI redirects and a graceful fallback for leads with no realistic action.

## Change

**File:** `supabase/functions/analyze-leads/nba-scenario-framework.ts`  
**Lines:** 311-316

Replace the current three bullet points and closing line with updated guidance:

**Current text:**
```
You MUST:
- For 75+ RTMI: Immediately pivot to Immensa/Sunrise ready options. Do NOT pitch UC.
- For Proxy Buyer: Push for decision maker visit or video call. Create urgency.
- For Settlement Seeker: Redirect to RTMI/Resale desk immediately.

This overrides all other considerations.
```

**New text:**
```
You MUST:
- For 75+ RTMI: Pivot to Immensa/Sunrise ready options ONLY if the customer's budget fits the closing price range of available units there (check KB). If budget does not match, explore other ways to address their concerns (e.g., flexible payment plans, alternate configurations within budget). Do NOT pitch UC.
- For Proxy Buyer: Push for decision maker visit or video call. Create urgency.
- For Settlement Seeker: Redirect to RTMI/Resale desk immediately.

IMPORTANT: If no realistic or feasible action/talking point exists for a lead, do NOT force-fit a solution. Instead, recommend a generic follow-up or long-term engagement plan (e.g., periodic check-ins, future launch updates, festive offer alerts). Accuracy matters more than comprehensiveness — never hallucinate data or fabricate arguments.

This overrides all other considerations.
```

## What Does NOT Change

- No other part of the playbook or prompt is modified
- The safety check logic (`checkSafetyConditions`) remains the same
- No changes to the matrix variant, other stages, or any other file
