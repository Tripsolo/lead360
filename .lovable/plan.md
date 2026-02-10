

# Plan: Disable A/B Test, Default to Scenario Variant

## Summary

Remove the 50/50 A/B test between "matrix" and "scenario" variants in Stage 3. The scenario variant becomes the sole workflow for TP/NBA generation.

## Changes

### 1. Hardcode variant to "scenario" (`index.ts`, ~line 3217)

Replace the A/B split logic:
```
// Before
const stage3Variant = (index % 2 === 0) ? "matrix" : "scenario";

// After
const stage3Variant: "matrix" | "scenario" = "scenario";
```

Update the log message to reflect it's no longer an A/B test.

### 2. Simplify Stage 3A prompt selection (`index.ts`, ~line 3274)

The conditional that picks between `buildStage3AScenarioClassificationPrompt` and `buildStage3AClassificationPrompt` can be simplified to always use the scenario version. The matrix classification prompt call becomes dead code.

### 3. No changes to evaluator or framework files

- `evaluator.ts` already handles `stage3Variant === "scenario"` correctly (skips Rules 1 and 9 ID validation)
- `nba-framework.ts` and `nba-scenario-framework.ts` remain unchanged -- both files stay in the codebase since the matrix code may be useful for future reference, but it will simply no longer be called

## What Does NOT Change

- Stage 3B scenario generation logic (unchanged)
- Evaluator rules and validation (unchanged, already scenario-aware)
- Database schema, UI, or any other stages
- The `nba-framework.ts` file (kept for reference, just not invoked)

