# Time Manager Full-Day Timeline + Hotkey Customization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 00:00-24:00 全时段时间轴、跨天自动切换并自动定位当前时间、柔和极简浮窗优化、设置页快捷键自定义（浮窗/快速创建）与周视图混合模式。

**Architecture:** 先提取可测试的时间与周视图状态纯函数，完成红绿测试；主进程改为可重注册全局快捷键；浮窗新增极简创建条并通过 IPC 回传创建任务；时间管理页统一处理状态同步并实现周视图紧凑+展开 24 小时轴。

**Tech Stack:** React 18, Electron, TypeScript, Vitest

---

### Task 1: 时间与周视图纯逻辑（TDD）

**Files:**
- Create: `src/components/timeManagerClock.ts`
- Create: `src/components/timeManagerClock.test.ts`

**Step 1: Write the failing test**
- 覆盖：
  - 24 小时刻度生成
  - 当前分钟计算
  - 距离次日 00:00 毫秒
  - 周视图展开键切换

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 实现上述纯函数。

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: PASS

### Task 2: 主进程快捷键可配置 + 冲突校验

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/vite-env.d.ts`

**Step 1: Write failing check**
Run: `npm run typecheck`
Expected: FAIL（新增 API 未实现）

**Step 2: Write minimal implementation**
- 新增 `toggleQuickPanel` 与 `quickCreateTodo` 自定义快捷键注册。
- 新增 IPC：检测冲突并保存/应用，不可注册时返回失败原因。
- 新增 IPC：浮窗快速创建 todo 请求转发到主窗口。

**Step 3: Run check to verify pass**
Run: `npm run typecheck`
Expected: PASS

### Task 3: 浮窗 UI 升级 + 极简创建条

**Files:**
- Modify: `src/components/QuickPanelWindow.tsx`
- Modify: `src/styles.css`

**Step 1: Write failing check**
Run: `npm run typecheck`
Expected: FAIL（新 API 调用未接线）

**Step 2: Write minimal implementation**
- 浮窗增加标题/时间/项目/详情层级。
- 新增标题、时间、详情输入与创建按钮（极简创建条）。
- 调用 IPC 创建任务。

**Step 3: Run check to verify pass**
Run: `npm run typecheck`
Expected: PASS

### Task 4: 时间管理页 24 小时、跨天自动切换、周视图混合

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/components/quickPanelState.ts`

**Step 1: Write failing test**
- 在 `timeManagerClock.test.ts` 补充 `now-line` 定位与跨天调度函数断言。

**Step 2: Run test to verify failure**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 日视图改为 24 小时滚动轴。
- 当前时间线每分钟更新并按本地时区定位。
- `00:00` 自动切到当天并滚动到当前时刻。
- 周视图默认紧凑卡，点击某天展开该天 24 小时轴。
- 监听浮窗创建事件写入待办与时间轴。

**Step 4: Run test to verify pass**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Expected: PASS

### Task 5: 设置页快捷键配置

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsPage.tsx`

**Step 1: Write failing check**
Run: `npm run typecheck`
Expected: FAIL

**Step 2: Write minimal implementation**
- 新增快捷键字段与默认值。
- 设置页支持录入两个快捷键。
- 保存前调用冲突检查，冲突时提示并不保存。

**Step 3: Run check to verify pass**
Run: `npm run typecheck`
Expected: PASS

### Task 6: Final Verification

**Step 1: Unit tests**
Run: `npm run test -- src/components/timeManagerClock.test.ts`
Run: `npm run test -- src/components/quickPanelState.test.ts`
Run: `npm run test -- src/components/timeManagerActions.test.ts`
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Run: `npm run test -- src/components/timeDragMath.test.ts`
Expected: PASS

**Step 2: Type check**
Run: `npm run typecheck`
Expected: PASS

**Step 3: Electron build**
Run: `npm run build:electron`
Expected: PASS
