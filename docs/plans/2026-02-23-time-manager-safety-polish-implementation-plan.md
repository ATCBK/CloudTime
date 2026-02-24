# Time Manager Safety & Visual Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce mis-operations and visual inconsistency on time manager page with minimal architectural change.

**Architecture:** Add a small tested helper module for schedule removal/undo mechanics and create-button guard. Wire it into `TimeManagerPage` with undo snackbar state. Refine layout grouping and empty state in JSX and CSS.

**Tech Stack:** React, TypeScript, Vitest, CSS

---

### Task 1: TDD helper module for safe removal

**Files:**
- Create: `src/components/timeManagerSafety.test.ts`
- Create: `src/components/timeManagerSafety.ts` (after RED)

**Step 1: Write failing tests**
- `canCreateTodo("  ")` => false
- `removeScheduleWithSnapshot` removes item and returns removed snapshot
- `undoRemovedSchedule` restores removed item and avoids duplication

**Step 2: Run RED**
- `npm test -- src/components/timeManagerSafety.test.ts`

**Step 3: Minimal implementation**
- Implement above helpers.

**Step 4: Run GREEN**
- `npm test -- src/components/timeManagerSafety.test.ts`

### Task 2: Wire TimeManagerPage behavior

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`

**Step 1: Use helper functions**
- Disable submit button when title is empty.
- Replace schedule direct delete with confirm + undo flow.

**Step 2: Toolbar grouping and copy**
- Split top chips into view group and tool group.
- Rename quick-create trigger text to “新建待办”.

**Step 3: Empty state**
- Show compact empty card when todo pool is empty.

**Step 4: Verify**
- `npm run typecheck`

### Task 3: CSS polish and safety affordance

**Files:**
- Modify: `src/styles.css`

**Step 1: Add styles**
- toolbar grouping
- disabled CTA
- todo empty state
- undo snackbar
- safer spacing for timeline actions

**Step 2: Final verification**
- `npm run typecheck`
- `npm run test`

