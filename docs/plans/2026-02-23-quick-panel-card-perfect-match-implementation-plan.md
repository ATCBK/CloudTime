# Quick Panel Card Perfect Match Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove quick-panel white background and make card style match `etc/explosive-growth-card.css` exactly.

**Architecture:** Add a tiny query-parser helper (TDD) to identify quick-panel view before render and apply document classes early. Then replace quick-panel CSS block with exact style values from reference file, mapped to app class names (`.explosive-card*` and `.quick-panel` compatibility).

**Tech Stack:** React, TypeScript, CSS, Vitest

---

### Task 1: TDD for quick-panel query detection

**Files:**
- Create: `src/components/quickPanelView.test.ts`
- Create: `src/components/quickPanelView.ts` (after failing test)
- Modify: `src/main.tsx`

**Step 1: Write failing tests**
- `?view=quick-panel` => true
- other query => false

**Step 2: Run RED**
- `npm test -- src/components/quickPanelView.test.ts`

**Step 3: Minimal implementation**
- Add `isQuickPanelViewSearch(search: string)` helper.
- Use in `main.tsx` and pre-apply class to `document.documentElement` + `document.body`.

**Step 4: Run GREEN**
- `npm test -- src/components/quickPanelView.test.ts`

### Task 2: Exact CSS parity with reference card

**Files:**
- Modify: `src/styles.css`

**Step 1: Replace quick-panel card style block**
- Keep transparency at `html/body/#root` for quick-panel view.
- Apply style values from `etc/explosive-growth-card.css` to `.explosive-card*`.
- Keep data binding classes in React unchanged.

**Step 2: Compatibility mapping**
- Ensure `.quick-panel` can share same look if in-app overlay is rendered.

**Step 3: Verify**
- `npm run typecheck`
- `npm run test`

