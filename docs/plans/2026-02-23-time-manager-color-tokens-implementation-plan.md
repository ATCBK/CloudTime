# Time Manager Color Tokens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the new brand palette to the time manager page only using scoped CSS variables.

**Architecture:** Add a small palette module with test coverage for the required six tokens, then wire the values into `.time-manager-shell` variables and replace time-manager scoped hard-coded colors with token references. Keep all non-time-manager styles untouched.

**Tech Stack:** React, TypeScript, CSS, Vitest

---

### Task 1: Add failing palette test

**Files:**
- Create: `src/components/timeManagerPalette.test.ts`
- Create: `src/components/timeManagerPalette.ts` (after fail)

**Step 1: Write the failing test**
- Assert exported palette includes six required token values.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/components/timeManagerPalette.test.ts`
- Expected: FAIL (`Cannot find module`).

**Step 3: Write minimal implementation**
- Export typed palette constants with exact hex values.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/components/timeManagerPalette.test.ts`
- Expected: PASS.

### Task 2: Wire CSS scoped tokens in time manager

**Files:**
- Modify: `src/styles.css`

**Step 1: Keep test green baseline**
- Run: `npm test -- src/components/timeManagerPalette.test.ts`

**Step 2: Minimal CSS implementation**
- Define six required variables under `.time-manager-shell`.
- Replace `.time-manager-shell` + `.time-manager-page` scoped hard-coded key colors with token-based values.
- Apply `--brand-yellow` to current time emphasis and `--status-error` to destructive controls.

**Step 3: Verify no regressions**
- Run: `npm run typecheck`
- Run: `npm run test`

### Task 3: Verify replacement scope

**Files:**
- Modify: `src/styles.css` (if any misses)

**Step 1: Scan**
- Run: `rg -n "time-manager-shell|time-manager-page|#[0-9a-fA-F]{6}" src/styles.css`

**Step 2: Fix misses minimally**
- Replace leftover time-manager hard-coded brand colors with tokens.

**Step 3: Final verification**
- Run: `npm run typecheck`
- Run: `npm run test`

