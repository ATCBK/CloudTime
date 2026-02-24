# Time Manager Visual Theme Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 仅改时间管理页视觉层，使布局、色彩、层次、卡片风格贴近参考图，保持交互逻辑不变。

**Architecture:** 通过 `time-manager-shell` 和 `time-manager-page` 作用域类隔离样式；新增少量展示辅助函数（问候语/时间胶囊文案）并以 TDD 驱动；CSS 增量覆盖原组件皮肤。

**Tech Stack:** React 18, TypeScript, CSS, Vitest

---

### Task 1: 主题辅助函数（TDD）

**Files:**
- Create: `src/components/timeManagerTheme.ts`
- Create: `src/components/timeManagerTheme.test.ts`

**Step 1: Write failing test**
- 测试：
  - `getGreetingLabel(hour)`
  - `formatClockPill(date)` 输出“上午/下午”

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/timeManagerTheme.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 实现最小函数通过测试。

**Step 4: Run test to verify pass**
Run: `npm run test -- src/components/timeManagerTheme.test.ts`
Expected: PASS

### Task 2: 页面结构类名接入

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TimeManagerPage.tsx`

**Steps:**
- App 壳添加 `time-manager-shell` 条件类。
- TimeManagerPage 增加 `time-manager-page`、header/pill/section 类名。
- 不改变数据逻辑。

### Task 3: scoped CSS 视觉重构

**Files:**
- Modify: `src/styles.css`

**Steps:**
- 新增 `.time-manager-shell` 与 `.time-manager-page` 范围样式。
- 重塑：左栏、顶部、三栏卡片、按钮、待办卡、时间轴卡、轻笔记容器。
- 保持原拖拽和时间线样式类可用。

### Task 4: Verification

Run:
- `npm run test -- src/components/timeManagerTheme.test.ts`
- `npm run test -- src/components/timeDragMath.test.ts`
- `npm run typecheck`
- `npm run build:electron`
