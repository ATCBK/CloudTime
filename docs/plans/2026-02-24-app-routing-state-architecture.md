# App Routing State Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将应用入口重构为路由化 + store 化架构，在不改变业务功能的前提下提升可维护性与可测试性。

**Architecture:** 使用 `react-router-dom` 承载页面路由，使用 `zustand` 承载应用级状态（导航、设置、运行时），并把 `App.tsx` 的副作用迁移到集中副作用层。页面业务组件保留现有逻辑，只改变装配方式。

**Tech Stack:** React 18, TypeScript, Vite, Vitest, react-router-dom, zustand

---

### Task 1: Add Routing/Store Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Write the failing test**

```ts
// No test for dependency change.
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: PASS (baseline check only)

**Step 3: Write minimal implementation**

Install:
- `react-router-dom`
- `zustand`

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add router and zustand dependencies"
```

### Task 2: Navigation Mapping Module (TDD)

**Files:**
- Create: `src/app/navigation.ts`
- Create: `src/app/navigation.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { pageToPath, pathToPage } from "./navigation";

describe("navigation mapping", () => {
  test("maps page to path", () => {
    expect(pageToPath("time_manager")).toBe("/time");
    expect(pageToPath("notes")).toBe("/notes");
    expect(pageToPath("settings")).toBe("/settings");
  });

  test("maps path to page with fallback", () => {
    expect(pathToPage("/time")).toBe("time_manager");
    expect(pathToPage("/unknown")).toBe("time_manager");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/navigation.test.ts`  
Expected: FAIL with module/function missing

**Step 3: Write minimal implementation**

```ts
export function pageToPath(page) { ... }
export function pathToPage(pathname) { ... }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/navigation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/navigation.ts src/app/navigation.test.ts
git commit -m "test: add navigation mapping coverage"
```

### Task 3: Settings Normalization Module (TDD)

**Files:**
- Create: `src/stores/settingsSchema.ts`
- Create: `src/stores/settingsSchema.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settingsSchema";

describe("settings normalization", () => {
  test("fills missing quick panel fields for legacy data", () => {
    const normalized = normalizeSettings({ opacity: 0.7 });
    expect(normalized.quickPanelOpacity).toBe(DEFAULT_SETTINGS.quickPanelOpacity);
    expect(normalized.quickPanelHotkey).toBe(DEFAULT_SETTINGS.quickPanelHotkey);
    expect(normalized.quickCreateTodoHotkey).toBe(DEFAULT_SETTINGS.quickCreateTodoHotkey);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/settingsSchema.test.ts`  
Expected: FAIL with module/function missing

**Step 3: Write minimal implementation**

```ts
export const DEFAULT_SETTINGS = { ... };
export function normalizeSettings(input: Partial<AppSettings>): AppSettings { ... }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/settingsSchema.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/settingsSchema.ts src/stores/settingsSchema.test.ts
git commit -m "test: add settings schema normalization coverage"
```

### Task 4: Create Zustand Stores

**Files:**
- Create: `src/stores/useNavigationStore.ts`
- Create: `src/stores/useSettingsStore.ts`
- Create: `src/stores/useRuntimeStore.ts`

**Step 1: Write the failing test**

```ts
// tests are covered by navigation/settings schema; store smoke relies on typecheck.
```

**Step 2: Run test to verify it fails**

Run: `npm run typecheck`  
Expected: FAIL before store files are wired

**Step 3: Write minimal implementation**

- `useNavigationStore` persisted to `cloudo.app.activePage`
- `useSettingsStore` persisted to `cloudo.app.settings` and normalized on load
- `useRuntimeStore` for `baseDir`

**Step 4: Run test to verify it passes**

Run: `npm run typecheck`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/useNavigationStore.ts src/stores/useSettingsStore.ts src/stores/useRuntimeStore.ts
git commit -m "feat: add app-level zustand stores"
```

### Task 5: Build Router + Shell + Effects

**Files:**
- Create: `src/app/AppRouter.tsx`
- Create: `src/app/AppShellLayout.tsx`
- Create: `src/app/AppEffects.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import { pathToPage } from "./navigation";
test("route fallback stays stable", () => {
  expect(pathToPage("/")).toBe("time_manager");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/navigation.test.ts`  
Expected: FAIL if root handling not added

**Step 3: Write minimal implementation**

- `AppRouter` 定义路由并注入 `AppEffects`
- `AppShellLayout` 统一侧边栏与 `Outlet`
- `App.tsx` 简化为 `<AppRouter />`
- `main.tsx` 主视图切到 `AppRouter`

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/navigation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/AppRouter.tsx src/app/AppShellLayout.tsx src/app/AppEffects.tsx src/main.tsx src/App.tsx src/app/navigation.test.ts
git commit -m "refactor: route app shell and centralize app effects"
```

### Task 6: Verification and Regression

**Files:**
- Modify: `docs/plans/2026-02-24-app-routing-state-architecture-design.md` (if verification notes needed)

**Step 1: Write the failing test**

```ts
// use existing test suite + typecheck/build as verification gates
```

**Step 2: Run test to verify it fails**

Run: `npm run typecheck` or `npm run build` during incomplete refactor  
Expected: FAIL until integration is complete

**Step 3: Write minimal implementation**

修复所有编译/测试问题，确保行为回归不变。

**Step 4: Run test to verify it passes**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build`

Expected: All PASS

**Step 5: Commit**

```bash
git add .
git commit -m "refactor: complete app routing/state architecture migration"
```
