# Time Manager Drag-Adaptive Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在保持现有蓝灰配色前提下，完成时间管理页清新化与拖拽时间轴自适应优化。

**Architecture:** 将拖拽时间计算提炼为纯函数模块并以单元测试驱动；页面层仅负责事件桥接与状态更新；样式层做低风险视觉增强。

**Tech Stack:** React 18, TypeScript, Vite, Vitest

---

### Task 1: 建立可测拖拽计算模块（TDD）

**Files:**
- Create: `src/components/timeDragMath.test.ts`
- Create: `src/components/timeDragMath.ts`
- Modify: `package.json`

**Step 1: Write the failing test**
- 编写测试覆盖：
  - 分钟吸附到 15 分钟步进
  - 拖拽区间边界裁剪
  - 自动滚动速度在边缘触发

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/components/timeDragMath.test.ts`
- Expected: FAIL（模块不存在或实现不符）

**Step 3: Write minimal implementation**
- 新建 `timeDragMath.ts`，提供：
  - `snapToStep`
  - `boundRange`
  - `computeAutoScrollDelta`

**Step 4: Run test to verify it passes**
- Run: `npm run test -- src/components/timeDragMath.test.ts`
- Expected: PASS

### Task 2: 接入 TimeManager 拖拽逻辑

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`

**Step 1: Write the failing test**
- 在已有 `timeDragMath.test.ts` 增加一个端到端计算断言（拖拽点 -> 吸附区间）。

**Step 2: Run test to verify it fails**
- Run: `npm run test -- src/components/timeDragMath.test.ts`
- Expected: FAIL

**Step 3: Write minimal implementation**
- 在 `TimeManagerPage` 中：
  - 拖拽预览采用 15 分钟吸附
  - 已排程卡拖拽也采用 15 分钟吸附
  - 在拖拽移动中加入边缘自动滚动
  - 预览卡文案增加时间段显示

**Step 4: Run test to verify it passes**
- Run: `npm run test -- src/components/timeDragMath.test.ts`
- Expected: PASS

### Task 3: 清新风样式优化

**Files:**
- Modify: `src/styles.css`

**Step 1: Write the failing test**
- 不新增 UI 自动化测试；改用编译与页面关键 class 存在性检查。

**Step 2: Run checks before implementation**
- Run: `npm run typecheck`
- Expected: PASS

**Step 3: Write minimal implementation**
- 优化 `.todo-create-form`、`.todo-card`、`.timeline`、`.timeline-card`、`.timeline-card.drop-preview`、`.now-line` 等样式。
- 保持主色与原风格一致。

**Step 4: Run checks**
- Run: `npm run typecheck`
- Expected: PASS

### Task 4: 最终验证

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Create: `src/components/timeDragMath.ts`
- Create: `src/components/timeDragMath.test.ts`

**Step 1: Verify tests**
- Run: `npm run test -- src/components/timeDragMath.test.ts`
- Expected: PASS

**Step 2: Verify typecheck**
- Run: `npm run typecheck`
- Expected: PASS

**Step 3: Commit**
- Run:
```bash
git add src/components/timeDragMath.ts src/components/timeDragMath.test.ts src/components/TimeManagerPage.tsx src/styles.css docs/plans/2026-02-22-time-manager-refresh-design.md docs/plans/2026-02-22-time-manager-refresh-implementation-plan.md package.json package-lock.json
git commit -m "feat: refresh time manager drag UX with adaptive snapping"
```

