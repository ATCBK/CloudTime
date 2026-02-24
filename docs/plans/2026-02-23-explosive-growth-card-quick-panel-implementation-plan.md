# Explosive Growth Card Quick Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild quick-panel UI with a shared Explosive Growth Card style and use it in the desktop quick-panel window, while aligning in-app quick-panel classes if present.

**Architecture:** Add a small pure model module for title/complete-all helpers and test it first (TDD). Create a shared `ExplosiveGrowthCard` presentational component with callbacks for item toggle and complete-all. Replace `QuickPanelWindow` markup with the shared component and add CSS derived from `etc/explosive-growth-card.css` under app-scoped class names.

**Tech Stack:** React 18, TypeScript, Vitest, CSS

---

### Task 1: Add failing model tests

**Files:**
- Create: `src/components/explosiveGrowthCardModel.test.ts`
- Create: `src/components/explosiveGrowthCardModel.ts` (after fail)

**Step 1: Write the failing test**
- Test `formatExplosiveCardTitle(new Date(2026,1,23)) -> "2月23日任务"`.
- Test `getIncompleteTodoIds` returns only incomplete todoIds and de-duplicates ids.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/components/explosiveGrowthCardModel.test.ts`
- Expected: FAIL (`Cannot find module`).

**Step 3: Write minimal implementation**
- Export the two helper functions.

**Step 4: Run test to verify it passes**
- Run: `npm test -- src/components/explosiveGrowthCardModel.test.ts`
- Expected: PASS.

### Task 2: Build shared Explosive Growth Card component

**Files:**
- Create: `src/components/ExplosiveGrowthCard.tsx`

**Step 1: Use model functions without changing behavior**
- Create component props for title/items/emptyText/onToggle/onCompleteAll.
- Reuse the check icon SVG from the HTML sample.

**Step 2: Verify with typecheck**
- Run: `npm run typecheck`
- Expected: PASS.

### Task 3: Wire QuickPanelWindow to shared component

**Files:**
- Modify: `src/components/QuickPanelWindow.tsx`

**Step 1: Keep behavior parity**
- Keep existing IPC subscription and per-item toggle.
- Use helper `getIncompleteTodoIds` for one-click complete.

**Step 2: Verify**
- Run: `npm run typecheck`
- Run: `npm run test`

### Task 4: Add reusable CSS style pack

**Files:**
- Modify: `src/styles.css`

**Step 1: Add `.explosive-*` style classes from `etc/explosive-growth-card.css`**
- Scope to quick-panel containers.
- Preserve transparent window background behavior.

**Step 2: Align in-app quick-panel classes**
- Map `.quick-panel` and `.quick-item` to same look (if rendered in-app).

**Step 3: Final verification**
- Run: `npm run typecheck`
- Run: `npm run test`

