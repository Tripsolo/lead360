

# Separate Cross-Sell Prompt with Enhanced Guardrails

## Summary

This plan creates a dedicated Stage 2.5 cross-sell recommendation step using Gemini 3 Flash Preview, with explicit guardrails for:
1. **OC Date for Possession** - Use `oc_date` (not `rera_possession`) for possession timeline matching
2. **Budget Ceiling (20%)** - Cross-sell recommendation must not exceed 20% of stated budget
3. **Possession Margin (8 months)** - Allow maximum 8-month flexibility for possession expectations
4. **Size/Config Constraints** - No more than 10% smaller; no fewer rooms; max 1 room more than desired

---

## Technical Implementation

### File to Modify
`supabase/functions/analyze-leads/index.ts`

---

### Change 1: Add CRM Field Explainer for Possession Date

**Location:** After `crmFieldExplainer` (around line 1403)

Add a new field explainer section emphasizing OC date usage:

```typescript
## INVENTORY & POSSESSION DATE FIELDS (CRITICAL)
- OC Date: The ACTUAL expected possession date for any SKU. USE THIS for possession timeline matching.
- RERA Possession Date: Regulatory deadline - NOT the actual expected possession. DO NOT use for customer timeline matching.
- RULE: Always use OC Date from inventory/sister project metadata for any possession-related analysis or recommendations.
```

---

### Change 2: Create New `buildCrossSellPrompt` Function

**Location:** After `buildStage2PromptMessages` function (around line 958)

Create a dedicated prompt builder for cross-sell recommendations:

```typescript
// ============= STAGE 2.5: Cross-Sell Recommendation =============
function buildCrossSellPrompt(
  analysisResult: any,
  extractedSignals: any,
  sisterProjects: any[],
  projectMetadata: any
): string {
  // Build sister projects data with OC dates (NOT RERA dates)
  const sisterProjectsData = sisterProjects.map((sp: any) => {
    const meta = sp.metadata || {};
    const triggers = sp.cross_sell_triggers || {};
    const configs = meta.configurations || [];
    
    // CRITICAL: Use OC date, fallback to RERA only if OC unavailable
    const possessionDate = meta.oc_date || meta.rera_possession || "N/A";
    
    return {
      name: sp.name,
      id: sp.id,
      relationship_type: sp.relationship_type,
      possession_date: possessionDate,  // OC Date prioritized
      oc_received: meta.oc_received || null,
      is_rtmi: meta.oc_received && meta.oc_received.length > 0,
      unique_selling: meta.unique_selling || "N/A",
      payment_plan: meta.payment_plan || "N/A",
      configurations: configs.map((c: any) => ({
        type: c.type,
        carpet_sqft_min: c.carpet_sqft?.[0] || null,
        carpet_sqft_max: c.carpet_sqft?.[1] || null,
        price_cr_min: c.price_cr?.[0] || null,
        price_cr_max: c.price_cr?.[1] || null,
        rooms: extractRoomCount(c.type) // "2 BHK" → 2, "3 BHK" → 3, etc.
      })),
      triggers: triggers
    };
  });
  
  // Extract lead's stated preferences
  const leadBudget = extractedSignals?.financial_signals?.budget_stated_cr || null;
  const leadConfig = extractedSignals?.property_preferences?.config_interested || null;
  const leadCarpetDesired = extractedSignals?.property_preferences?.carpet_area_desired || null;
  const leadPossessionUrgency = extractedSignals?.engagement_signals?.possession_urgency || null;
  const leadStagePreference = extractedSignals?.property_preferences?.stage_preference || null;
  const leadRooms = extractRoomCount(leadConfig);
  
  const crossSellPrompt = `# CROSS-SELL RECOMMENDATION EVALUATION

You are evaluating whether a lead should be recommended a sister project from the same township.

## LEAD PROFILE (Extracted from Stage 2)
- Stated Budget: ${leadBudget ? `₹${leadBudget} Cr` : "Not stated"}
- Desired Config: ${leadConfig || "Not stated"}
- Desired Rooms: ${leadRooms || "Unknown"}
- Desired Carpet Area: ${leadCarpetDesired || "Not stated"}
- Possession Urgency: ${leadPossessionUrgency || "Not stated"}
- Stage Preference: ${leadStagePreference || "Not stated"}
- Persona: ${analysisResult.persona || "Unknown"}
- Primary Concern: ${analysisResult.primary_concern_category || "Unknown"}
- Core Motivation: ${analysisResult.extracted_signals?.core_motivation || "Unknown"}

## SISTER PROJECTS AVAILABLE
${JSON.stringify(sisterProjectsData, null, 2)}

## CROSS-SELL EVALUATION RULES (CRITICAL - ALL MUST PASS)

### RULE 1: BUDGET CEILING (20% MAX)
- The recommended project's entry price (price_cr_min for matching config) must NOT exceed 120% of the lead's stated budget.
- Formula: IF (sister_project_price_cr_min > lead_budget * 1.20) THEN REJECT
- If budget is not stated, this rule passes automatically.

### RULE 2: POSSESSION MARGIN (8 MONTHS MAX)
- The possession date difference from lead's expectation must be within 8 months.
- Use OC Date (possession_date field) - NOT RERA date.
- If lead needs RTMI, only recommend projects with is_rtmi = true OR possession within 8 months from today.
- If lead has no specific possession urgency, this rule passes automatically.

### RULE 3: SIZE CONSTRAINT (10% SMALLER MAX)
- The recommended config's carpet area must not be more than 10% smaller than desired.
- Formula: IF (sister_config_carpet_sqft_max < lead_desired_carpet * 0.90) THEN REJECT
- If carpet area is not stated, use typical config size comparison.

### RULE 4: ROOM COUNT CONSTRAINT (STRICT)
- NEVER recommend a config with FEWER rooms than desired.
- NEVER recommend a config with MORE THAN 1 ADDITIONAL room.
- Examples:
  - Lead wants 2 BHK → Can recommend 2 BHK or 3 BHK only (NOT 1 BHK, NOT 4 BHK)
  - Lead wants 3 BHK → Can recommend 3 BHK or 4 BHK only (NOT 2 BHK, NOT 5 BHK)
  - Lead wants 4 BHK → Can recommend 4 BHK only (5 BHK if exists, but never smaller)

### RULE 5: MATCH PRIORITY (If multiple pass)
If multiple sister projects pass all rules, prioritize:
1. RTMI needs (if lead has urgent possession)
2. Budget optimization (closest to stated budget)
3. Config exact match (same room count preferred)
4. GCP view preference (if lead expressed interest)

## EVALUATION PROCESS
1. For each sister project, check ALL 4 rules above.
2. Log which rules pass/fail for each project.
3. If no project passes all rules, return null.
4. If one or more pass, select the best match per priority rules.

## OUTPUT STRUCTURE
Return a JSON object with ONLY these fields:
{
  "cross_sell_recommendation": {
    "recommended_project": "Primera" | "Estella" | "Immensa" | null,
    "recommended_config": "2 BHK" | "3 BHK" | "4 BHK" | null,
    "price_range_cr": "₹X.XX - ₹Y.YY Cr",
    "possession_date": "YYYY-MM",
    "reason": "Brief explanation of why this is a better fit (max 25 words)",
    "talking_point": "Specific sales pitch with price/config/possession details (max 25 words)",
    "rules_evaluation": {
      "budget_check": "PASS" | "FAIL" | "N/A",
      "possession_check": "PASS" | "FAIL" | "N/A",
      "size_check": "PASS" | "FAIL" | "N/A",
      "room_check": "PASS" | "FAIL" | "N/A"
    }
  } | null,
  "evaluation_log": "Brief log of which projects were considered and why they passed/failed"
}

If no sister project meets all criteria, return:
{
  "cross_sell_recommendation": null,
  "evaluation_log": "No sister project passed all validation rules. [Reason for each rejection]"
}`;

  return crossSellPrompt;
}

// Helper to extract room count from config string
function extractRoomCount(config: string | null): number | null {
  if (!config) return null;
  const match = config.match(/(\d+)\s*BHK/i);
  return match ? parseInt(match[1]) : null;
}
```

---

### Change 3: Add `callCrossSellAPI` Function

**Location:** After `callGemini3FlashAPI` function (around line 670)

```typescript
// ============= Cross-Sell API (Gemini 3 Flash) =============
async function callCrossSellAPI(
  prompt: string,
  googleApiKey: string,
  maxRetries: number = 2,
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const generationConfig = {
        temperature: 0.1,  // Lower temperature for more deterministic rule-following
        topK: 20,
        topP: 0.9,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(text);
      }

      const errorText = await response.text();
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 500;
        console.warn(`Cross-sell API rate limited (attempt ${attempt}), retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      
      lastError = new Error(`Cross-sell API failed: ${errorText}`);
    } catch (fetchError) {
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
    }
  }
  
  console.error("Cross-sell API failed after retries:", lastError);
  return { cross_sell_recommendation: null, evaluation_log: "API call failed" };
}
```

---

### Change 4: Integrate Stage 2.5 into Pipeline

**Location:** After Stage 2 completes, before Stage 3 (around line 2395)

Insert a new Stage 2.5 call between Stage 2 and Stage 3:

```typescript
// ===== STAGE 2.5: CROSS-SELL RECOMMENDATION (Gemini 3 Flash) =====
if (parseSuccess && sisterProjects && sisterProjects.length > 0) {
  console.log(`Stage 2.5 (Cross-Sell) starting for lead ${lead.id}`);
  
  try {
    // Add small delay before cross-sell call
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    const crossSellPrompt = buildCrossSellPrompt(
      analysisResult,
      extractedSignals,
      sisterProjects,
      projectMetadata
    );
    
    const crossSellResult = await callCrossSellAPI(crossSellPrompt, googleApiKey!);
    
    // Merge cross-sell recommendation into analysis result
    if (crossSellResult?.cross_sell_recommendation) {
      analysisResult.cross_sell_recommendation = crossSellResult.cross_sell_recommendation;
      console.log(`Stage 2.5 complete: Recommended ${crossSellResult.cross_sell_recommendation.recommended_project} for lead ${lead.id}`);
    } else {
      analysisResult.cross_sell_recommendation = null;
      console.log(`Stage 2.5 complete: No cross-sell recommendation for lead ${lead.id}. ${crossSellResult?.evaluation_log || ""}`);
    }
  } catch (crossSellError) {
    console.warn(`Stage 2.5 failed for lead ${lead.id}:`, crossSellError);
    analysisResult.cross_sell_recommendation = null;
  }
}
```

---

### Change 5: Update Sister Projects Context in Stage 2

**Location:** Around line 1858 in `sisterProjectsContext` building

Update to emphasize OC date over RERA date:

```typescript
// Change this line:
- Possession: ${meta.rera_possession || meta.oc_date || "N/A"}

// To this (OC date prioritized):
- Possession (OC Date): ${meta.oc_date || "Under construction"}
- RERA Deadline: ${meta.rera_possession || "N/A"}
- OC Status: ${meta.oc_received ? `OC received for towers ${meta.oc_received.join(", ")}` : "Pending"}
```

---

### Change 6: Update Output Structure for Cross-Sell

**Location:** Around line 1920-1925

Update the cross-sell output structure to include new fields:

```typescript
"cross_sell_recommendation": {
  "recommended_project": "Primera" | "Estella" | "Immensa" | null,
  "recommended_config": "2 BHK" | "3 BHK" | "4 BHK" | null,
  "price_range_cr": "₹X.XX - ₹Y.YY Cr",
  "possession_date": "YYYY-MM",
  "reason": "Brief explanation (max 25 words)",
  "talking_point": "Sales pitch with details (max 25 words)",
  "rules_evaluation": {
    "budget_check": "PASS" | "FAIL" | "N/A",
    "possession_check": "PASS" | "FAIL" | "N/A",
    "size_check": "PASS" | "FAIL" | "N/A",
    "room_check": "PASS" | "FAIL" | "N/A"
  }
} | null
```

---

## Summary of Guardrails Implemented

| Guardrail | Implementation |
|-----------|----------------|
| **OC Date for Possession** | `possession_date = meta.oc_date || meta.rera_possession` - OC prioritized |
| **Budget Ceiling (20%)** | `sister_price_min <= lead_budget * 1.20` |
| **Possession Margin (8 months)** | Possession difference from expectation ≤ 8 months |
| **Size Constraint (10%)** | `sister_carpet_max >= lead_carpet * 0.90` |
| **Room Count - No Fewer** | Sister rooms >= Lead desired rooms |
| **Room Count - Max +1** | Sister rooms <= Lead desired rooms + 1 |

---

## Pipeline Flow After Changes

```text
Stage 1 (Gemini 3 Flash) → Signal Extraction
        ↓
Stage 2 (Claude Opus 4.5) → Scoring & Persona
        ↓
Stage 2.5 (Gemini 3 Flash) → Cross-Sell Recommendation [NEW]
        ↓
Stage 3 (Gemini 3 Flash) → NBA & Talking Points
```

---

## Testing Recommendations

After implementing:

1. **Test Budget Ceiling**: Analyze a lead with stated budget ₹1.5 Cr - should NOT recommend Estella 3BHK (₹1.97Cr = 31% above budget)
2. **Test Possession Margin**: Analyze a lead needing RTMI - should only recommend Immensa (OC received)
3. **Test Room Constraint**: Analyze a lead wanting 3 BHK - should NOT recommend Primera (only 2 BHK available)
4. **Test Size Constraint**: Analyze a lead wanting 1000 sqft - should NOT recommend Primera 2BHK compact (400-499 sqft = 50% smaller)

