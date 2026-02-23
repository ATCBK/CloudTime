# Time Manager Independent Quick Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现独立透明快捷浮窗（应用内按钮 + 全局快捷键同窗唤起）、独立浮窗透明度设置、并完善待办池与时间轴隔离及详情/引用交互。

**Architecture:** 采用主进程双窗口架构；主窗口负责业务状态与持久化，独立浮窗只做展示与快速勾选；通过 preload IPC 做状态同步与动作回传。时间轴与待办池隔离逻辑保持在 TimeManagerPage，纯逻辑抽到可测函数。

**Tech Stack:** Electron, React 18, TypeScript, Vitest

---

### Task 1: Quick Panel 数据模型与纯函数（TDD）

**Files:**
- Create: `src/components/quickPanelState.ts`
- Create: `src/components/quickPanelState.test.ts`
- Modify: `src/components/timeManagerActions.ts`

**Step 1: Write the failing test**
- 为 `buildQuickPanelItems` 编写测试：
  - 仅输出指定日期任务
  - 按开始时间排序
  - 合并 todo 的 completed/details
- 为 `removeTodoAfterSchedule` 编写测试：
  - todo 拖入时间轴后从池中删除

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/quickPanelState.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 新增 `buildQuickPanelItems`、`removeTodoAfterSchedule` 等最小函数。

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/quickPanelState.test.ts`
Expected: PASS

### Task 2: 主进程独立透明 BrowserWindow（TDD with type checks）

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`

**Step 1: Write the failing test / check**
- 先更新类型声明中 quick panel API，再让 `typecheck` 暴露未实现调用点。

**Step 2: Run check to verify failure**
Run: `npm run typecheck`
Expected: FAIL（缺失 API 或参数不匹配）

**Step 3: Write minimal implementation**
- 新增 `quickPanelWindow` 创建与 `toggleQuickPanelWindow`。
- `Alt+Q` 与应用内按钮都走 `window:toggleQuickPanel`。
- 新增 `quickPanel:setOpacity`、`quickPanel:updateState`、`quickPanel:taskToggle` IPC。
- preload 暴露对应 API 和事件订阅。

**Step 4: Run check to verify pass**
Run: `npm run typecheck`
Expected: PASS

### Task 3: Renderer 双入口与浮窗 UI（TDD）

**Files:**
- Modify: `src/main.tsx`
- Create: `src/components/QuickPanelWindow.tsx`
- Modify: `src/styles.css`

**Step 1: Write the failing test**
- 新建 `src/components/quickPanelState.test.ts` 增加 UI 数据映射断言（无任务/有任务/勾选状态）。

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/quickPanelState.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- `main.tsx` 根据 `window.location.search` 渲染 `QuickPanelWindow`。
- `QuickPanelWindow` 实现透明卡片样式、清单勾选、空态。

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/quickPanelState.test.ts`
Expected: PASS

### Task 4: TimeManager 交互隔离与同步（TDD）

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/components/timeManagerActions.test.ts`

**Step 1: Write the failing test**
- 增加断言：
  - todo->timeline 后 todo 池移除
  - timeline->todo 后 timeline 移除并恢复 todo

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 在 drop 到时间轴时删除 todo 池项。
- 回拖到待办池沿用恢复逻辑并确保时间轴删除。
- “快捷面板”按钮改调用 `window.cloudo.toggleQuickPanelWindow()`。
- 每次状态变化推送 quick panel 快照。

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: PASS

### Task 5: 设置页浮窗透明度联动

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsPage.tsx`

**Step 1: Write the failing check**
Run: `npm run typecheck`
Expected: FAIL（新增 settings 字段未接线）

**Step 2: Write minimal implementation**
- `AppSettings` 增加 `quickPanelOpacity`。
- 设置页新增滑杆，实时调用 `window.cloudo.setQuickPanelOpacity`。

**Step 3: Run check to verify pass**
Run: `npm run typecheck`
Expected: PASS

### Task 6: Final Verification

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/main.tsx`
- Create: `src/components/QuickPanelWindow.tsx`
- Modify: `src/components/TimeManagerPage.tsx`
- Create: `src/components/quickPanelState.ts`
- Create: `src/components/quickPanelState.test.ts`
- Modify: `src/components/timeManagerActions.ts`
- Modify: `src/components/timeManagerActions.test.ts`
- Modify: `src/components/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/styles.css`

**Step 1: Verify tests**
Run: `npm run test -- src/components/quickPanelState.test.ts`
Expected: PASS

Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: PASS

Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: PASS

Run: `npm run test -- src/components/timeDragMath.test.ts`
Expected: PASS

**Step 2: Verify typecheck**
Run: `npm run typecheck`
Expected: PASS

**Step 3: Verify electron build**
Run: `npm run build:electron`
Expected: PASS
