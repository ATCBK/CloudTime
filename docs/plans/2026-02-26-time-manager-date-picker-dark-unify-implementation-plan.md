# Time Manager Date Picker + Dark Unify Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在日视图提供可选任意日期的原生日期选择器，并统一周/月视图在 dark 模式下的视觉层级与配色变量。

**Architecture:** 保持 `selectedDateKey` 作为唯一选中日期状态，不新增全局状态。通过一个小型日期字符串校验函数保护输入；UI 层仅消费校验后的值。样式层将周/月关键选择器改为 Time Manager token，light/dark 分别映射，避免硬编码颜色遗漏。

**Tech Stack:** React 18 + TypeScript + Vitest + CSS variables (`src/styles.css`)

---

### Task 1: Date Input Validation Helper (TDD)

**Files:**
- Modify: `src/components/timeManagerClock.ts`
- Test: `src/components/timeManagerClock.test.ts`

**Step 1: Write the failing test**

```ts
it("accepts valid date key and rejects invalid date key", () => {
  expect(isValidDateKey("2026-02-26")).toBe(true);
  expect(isValidDateKey("2026-2-26")).toBe(false);
  expect(isValidDateKey("2026-13-01")).toBe(false);
  expect(isValidDateKey("foo")).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/timeManagerClock.test.ts`  
Expected: FAIL with `isValidDateKey is not defined` or import error.

**Step 3: Write minimal implementation**

```ts
export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/timeManagerClock.test.ts`  
Expected: PASS for the new case and existing `timeManagerClock` tests.

**Step 5: Commit**

```bash
git add src/components/timeManagerClock.ts src/components/timeManagerClock.test.ts
git commit -m "test(time): add date key validation helper for date picker"
```

### Task 2: Wire Day-View Header Date Picker (TDD-Oriented)

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- (Reuse Test): `src/components/timeManagerClock.test.ts`

**Step 1: Write the failing behavior check in component logic path**

在 `TimeManagerPage.tsx` 中先引入 `isValidDateKey` 并替换原 `soft-text` 日期文案为 `input[type="date"]`，暂时先保留旧文案旁注，确保编译会因未完成处理分支而暴露问题（例如未处理空值导致 lint/typecheck 报错）。

最小目标行为：
- `value={selectedDateKey}`
- `onChange` 里仅当 `isValidDateKey(nextValue)` 为真才 `setSelectedDateKey(nextValue)`

**Step 2: Run verification to see current failure**

Run: `npm run typecheck`  
Expected: 在改造过程中出现类型或未使用变量错误（临时失败）。

**Step 3: Complete minimal implementation**

```tsx
<label className="tm-date-picker-label">
  <span className="soft-text">日期</span>
  <input
    type="date"
    className="tm-date-picker-input"
    value={selectedDateKey}
    onChange={(event) => {
      const next = event.target.value;
      if (isValidDateKey(next)) setSelectedDateKey(next);
    }}
    aria-label="选择计划日期"
  />
</label>
```

**Step 4: Run checks**

Run:
- `npm run typecheck`
- `npm test -- src/components/timeManagerClock.test.ts`

Expected:
- typecheck PASS
- test PASS

**Step 5: Commit**

```bash
git add src/components/TimeManagerPage.tsx src/components/timeManagerClock.ts src/components/timeManagerClock.test.ts
git commit -m "feat(time): replace day header date text with native date picker"
```

### Task 3: Unify Week/Month Colors with Time Manager Tokens

**Files:**
- Modify: `src/styles.css`

**Step 1: Write failing target (visual contract checklist in code comments)**

在 `styles.css` 的 Time Manager dark override 区域先添加 TODO 注释清单，列出必须 token 化的选择器（`week-cell/month-cell/week-item/week-expanded-*`）。这一步会先让代码处于“未完成契约”状态，便于 reviewer 对照。

**Step 2: Apply minimal tokenized implementation**

在 `.time-manager-shell` 增加并映射变量：

```css
--tm-surface: #ffffff;
--tm-surface-soft: #f8fbff;
--tm-border: #d9e2f4;
--tm-text: #21385f;
--tm-text-muted: #7a86a7;
```

dark 下：

```css
--tm-surface: #252526;
--tm-surface-soft: #2d2d30;
--tm-border: #3c3c3c;
--tm-text: #d4d4d4;
--tm-text-muted: #9da5b4;
```

并将以下选择器改为变量：
- `.week-cell`, `.month-cell`, `.week-item`
- `.week-expanded-day`, `.week-expanded-row`, `.week-expanded-row span`, `.week-expanded-card`
- `.week-date-btn.active`（背景/字色走 token，保持 active 语义）
- `.month-cell.muted`（保留透明度，文本颜色走 token）

**Step 3: Verify**

Run:
- `npm run typecheck`
- `npm test`

Expected:
- 全部 PASS（样式改动不应破坏 TS/单测）

**Step 4: Manual acceptance**

在 `npm run dev` 下手工检查：
1. 日视图切换未来日期可正常规划任务。  
2. 切换周/月视图内容与日期联动正确。  
3. dark 下周/月卡片、边框、文字与日视图层级一致，无浅底突兀块。

**Step 5: Commit**

```bash
git add src/styles.css
git commit -m "style(time): unify week and month dark palette with tm tokens"
```

### Task 4: Final Verification and PR Notes

**Files:**
- Modify: `docs/plans/2026-02-26-time-manager-date-picker-dark-unify-implementation-plan.md` (append execution notes/checklist)

**Step 1: Full verification**

Run:
- `npm run typecheck`
- `npm test`

Expected:
- 全绿通过。

**Step 2: Record verification evidence**

在计划文档末尾补充执行记录（命令、时间、结果摘要）。

**Step 3: Commit**

```bash
git add docs/plans/2026-02-26-time-manager-date-picker-dark-unify-implementation-plan.md
git commit -m "docs(plan): append verification evidence for time manager update"
```

---

## Implementation Notes

- Keep DRY/YAGNI: 日期输入不引入新 store；仅复用 `selectedDateKey`。
- Keep TDD: 先补 `isValidDateKey` 测试，再接 UI。
- Frequent commits: 每个任务一提交，方便回滚和 review。
- Recommended supporting skills during execution:
  - `@superpowers/test-driven-development`
  - `@superpowers/verification-before-completion`
  - `@superpowers/requesting-code-review`

