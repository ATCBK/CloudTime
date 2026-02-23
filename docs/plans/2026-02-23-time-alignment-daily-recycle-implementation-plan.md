# Time Alignment + Daily Recycle + Panel Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复时间轴日期与本机时间不一致问题，启动强制当天；实现 23:59 未完成任务自动回池；悬浮面板仅展示今日任务；主窗口作为唯一创建入口；隐藏时间轴滚动轴并优化滑动体验。

**Architecture:** 通过 `timeManagerClock` 提供时间边界纯函数并先做 TDD；`TimeManagerPage` 负责日期强制同步、自动回池、主窗口创建入口聚焦；`QuickPanelWindow` 精简为只读今日任务；主进程快捷创建热键改为唤起主窗口创建输入。

**Tech Stack:** React 18, Electron, TypeScript, Vitest

---

### Task 1: 时间边界与回池判定函数（TDD）

**Files:**
- Modify: `src/components/timeManagerClock.ts`
- Modify: `src/components/timeManagerClock.test.ts`

**Step 1: Write failing tests**
- 新增：
  - `computeMsUntilTodayRecycle`（到当天 23:59）
  - `isSameDateKey`

**Step 2: Run test to verify failure**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: FAIL

**Step 3: Minimal implementation**
- 实现上述函数。

**Step 4: Run test to verify pass**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: PASS

### Task 2: 时间轴日期强制对齐 + 23:59 自动回池

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`

**Steps**
- 启动时 `selectedDateKey` 强制为本机当天。
- 每分钟刷新当前时间线位置。
- 每天 23:59 自动将当天未完成 schedule 回池并从时间轴移除。
- 继续保留跨天切换到当天。

### Task 3: 悬浮面板只展示今日任务

**Files:**
- Modify: `src/components/QuickPanelWindow.tsx`
- Modify: `src/styles.css`

**Steps**
- 移除浮窗创建输入区，仅保留今日任务列表与勾选。
- 样式同步精简。

### Task 4: 创建入口回主窗口

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/App.tsx`

**Steps**
- 快捷创建热键行为改为：显示主窗口并聚焦待办创建输入。
- 移除浮窗创建 IPC 依赖。

### Task 5: 隐藏时间轴滚动轴 + 滑动优化

**Files:**
- Modify: `src/styles.css`

**Steps**
- 隐藏时间轴滚动条视觉但保持可滚动。
- 保留平滑滚动体验。

### Task 6: Final Verification

Run:
- `npm run test -- src/components/timeManagerClock.test.ts`
- `npm run test -- src/components/quickPanelState.test.ts`
- `npm run test -- src/components/timeManagerActions.test.ts`
- `npm run test -- src/components/lightNoteRichText.test.ts`
- `npm run test -- src/components/timeDragMath.test.ts`
- `npm run typecheck`
- `npm run build:electron`
