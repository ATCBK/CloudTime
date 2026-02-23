# Time Manager Simplification + Quick Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 简化轻笔记为直接所见即写，支持时间轴任务回拖到待办、任务复制关联到轻笔记、并新增当天任务透明浮窗（应用内按钮 + 全局快捷键）。

**Architecture:** 提取任务转换与轻笔记卡片 HTML 生成逻辑为纯函数模块并先行测试；TimeManagerPage 负责拖拽状态与 UI 编排；Electron 通过 IPC 事件统一触发同一个渲染层浮窗。

**Tech Stack:** React 18, TypeScript, Vitest, Electron

---

### Task 1: 建立交互纯函数模块（TDD）

**Files:**
- Create: `src/components/timeManagerActions.ts`
- Create: `src/components/timeManagerActions.test.ts`

**Step 1: Write the failing test**
- 覆盖：
  - 时间轴任务转换回待办（带详情）
  - 轻笔记引用卡片 HTML 生成
  - 当天任务快捷勾选状态映射

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 实现：`scheduleToTodoCandidate`、`buildTaskReferenceCardHtml`、`toggleTodoCompleted`

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: PASS

### Task 2: 简化轻笔记与拖拽关联

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/components/lightNoteRichText.ts`
- Modify: `src/styles.css`

**Step 1: Write the failing test**
- 在 `timeManagerActions.test.ts` 增加引用卡片字段断言。

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 删除轻笔记编辑/预览模式切换，始终 WYSIWYG。
- 时间轴卡片支持拖拽到左侧待办池：
  - drop 后从时间轴删除
  - 待办池新增/恢复待办
- 时间轴卡片支持拖拽复制到轻笔记：插入富文本卡片引用（标题/时间/项目）
- 时间轴卡片右上角新增详情按钮（与删除并列）

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: PASS

### Task 3: 透明快捷浮窗（同一浮窗，双触发）

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`

**Step 1: Write the failing test**
- 不新增 Electron 自动化测试，保留类型与现有单测验证。

**Step 2: Run checks before implementation**
Run: `npm run typecheck`
Expected: PASS

**Step 3: Write minimal implementation**
- 新增全局快捷键（不替换现有窗口切换）发送 `quick-panel:toggle` 事件到 renderer。
- preload 暴露 `onToggleQuickPanel` 订阅。
- TimeManagerPage 新增透明浮窗：展示当天任务、快速勾选。
- 页面内新增按钮触发同一浮窗状态。

**Step 4: Run checks**
Run: `npm run typecheck`
Expected: PASS

### Task 4: 最终验证

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/components/lightNoteRichText.ts`
- Modify: `src/styles.css`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`
- Create: `src/components/timeManagerActions.ts`
- Create: `src/components/timeManagerActions.test.ts`

**Step 1: Verify tests**
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Expected: PASS

Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: PASS

Run: `npm run test -- src/components/timeDragMath.test.ts`
Expected: PASS

**Step 2: Verify typecheck**
Run: `npm run typecheck`
Expected: PASS
