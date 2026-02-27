# Time Manager Todo Type Filter + Modal Create Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在时间管理页实现待办池按类型筛选（可滚动+左右切换+新建类型）与“新建待办弹窗+类型下拉”，默认类型为“通用”并兼容历史空类型数据。

**Architecture:** 继续复用 `TodoItem.project` 作为类型字段，不改动数据模型。将“类型列表初始化/归并/校验”提取为纯函数并先补单测；`TimeManagerPage` 仅负责状态编排与交互绑定。UI 在左侧待办池新增类型条和新类型创建入口，并将原内联创建表单替换为弹窗表单。

**Tech Stack:** React + TypeScript + Vite + Vitest + Testing Library + CSS

---

### Task 1: 类型模型与校验纯函数

**Files:**
- Create: `src/components/todoTypeModel.ts`
- Create: `src/components/todoTypeModel.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TODO_TYPE,
  normalizeTodoType,
  buildTodoTypesFromTodos,
  canCreateTodoType
} from "./todoTypeModel";

describe("todoTypeModel", () => {
  it("maps empty values to default type", () => {
    expect(normalizeTodoType("")) .toBe(DEFAULT_TODO_TYPE);
    expect(normalizeTodoType("   ")).toBe(DEFAULT_TODO_TYPE);
  });

  it("builds deduplicated type list with default first", () => {
    const types = buildTodoTypesFromTodos([
      { project: "工作" },
      { project: " 通用 " },
      { project: "" },
      { project: "学习" }
    ]);
    expect(types[0]).toBe(DEFAULT_TODO_TYPE);
    expect(types).toContain("工作");
    expect(types).toContain("学习");
  });

  it("validates create type rules", () => {
    expect(canCreateTodoType("", ["通用"]).ok).toBe(false);
    expect(canCreateTodoType("通用", ["通用"]).ok).toBe(false);
    expect(canCreateTodoType("新类型", ["通用"]).ok).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/todoTypeModel.test.ts`
Expected: FAIL with module/function not found

**Step 3: Write minimal implementation**

```ts
export const DEFAULT_TODO_TYPE = "通用";
const MAX_TODO_TYPE_LEN = 20;

export function normalizeTodoType(raw?: string | null): string {
  const value = (raw ?? "").trim();
  return value ? value : DEFAULT_TODO_TYPE;
}

export function buildTodoTypesFromTodos(
  todos: Array<{ project?: string | null }>,
  extraTypes: string[] = []
): string[] {
  const set = new Set<string>([DEFAULT_TODO_TYPE]);
  extraTypes.forEach((v) => set.add(normalizeTodoType(v)));
  todos.forEach((todo) => set.add(normalizeTodoType(todo.project)));
  const list = Array.from(set).filter(Boolean);
  return [DEFAULT_TODO_TYPE, ...list.filter((x) => x !== DEFAULT_TODO_TYPE)];
}

export function canCreateTodoType(
  raw: string,
  existing: string[]
): { ok: boolean; reason?: "empty" | "duplicate" | "too_long"; value?: string } {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > MAX_TODO_TYPE_LEN) return { ok: false, reason: "too_long" };
  const key = value.toLocaleLowerCase();
  const exists = existing.some((item) => item.trim().toLocaleLowerCase() === key);
  if (exists) return { ok: false, reason: "duplicate" };
  return { ok: true, value };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/todoTypeModel.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/todoTypeModel.ts src/components/todoTypeModel.test.ts
git commit -m "test+feat(time): add todo type model and validation"
```

### Task 2: 待办池类型筛选状态与渲染

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Test: `src/components/TimeManagerPage.test.tsx` (如不存在则新建)

**Step 1: Write the failing test**

```tsx
it("shows only selected type todos in pool", async () => {
  render(<TimeManagerPage todos={seedTodos} timelineItems={[]} />);
  await user.click(screen.getByRole("button", { name: "工作" }));
  expect(screen.getByText("任务A")).toBeInTheDocument();
  expect(screen.queryByText("学习任务")).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: FAIL because no type filter controls exist

**Step 3: Write minimal implementation**

```tsx
// state
const [todoTypes, setTodoTypes] = useLocalStorageState<string[]>("cloudo.time.todoTypes", [DEFAULT_TODO_TYPE]);
const [selectedTodoType, setSelectedTodoType] = useLocalStorageState<string>("cloudo.time.selectedTodoType", DEFAULT_TODO_TYPE);

// derived
const normalizedTodos = useMemo(
  () => todosState.map((todo) => ({ ...todo, project: normalizeTodoType(todo.project) })),
  [todosState]
);
const visibleTodos = useMemo(
  () => normalizedTodos.filter((todo) => normalizeTodoType(todo.project) === selectedTodoType),
  [normalizedTodos, selectedTodoType]
);
```

Add UI section above todo list:
- type rail container
- chip buttons from `todoTypes`
- selected chip active
- render `visibleTodos` instead of full `todosState`

Add CSS:
- `.tm-type-rail`, `.tm-type-scroll`, `.tm-type-chip`, `.tm-type-chip.active`

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/TimeManagerPage.tsx src/styles.css src/components/TimeManagerPage.test.tsx
git commit -m "feat(time): add todo pool type filter rail"
```

### Task 3: 分类条滚动 + 左右箭头切换

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Test: `src/components/TimeManagerPage.test.tsx`

**Step 1: Write the failing test**

```tsx
it("switches selected type with arrow buttons", async () => {
  render(<TimeManagerPage todos={seedTodos} timelineItems={[]} />);
  await user.click(screen.getByRole("button", { name: "下一类型" }));
  expect(screen.getByRole("button", { name: "工作" })).toHaveClass("active");
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: FAIL because arrows are not implemented

**Step 3: Write minimal implementation**

```tsx
const typeScrollRef = useRef<HTMLDivElement>(null);

const shiftType = (delta: -1 | 1): void => {
  const index = todoTypes.findIndex((t) => t === selectedTodoType);
  const nextIndex = Math.min(todoTypes.length - 1, Math.max(0, index + delta));
  setSelectedTodoType(todoTypes[nextIndex] ?? DEFAULT_TODO_TYPE);
  typeScrollRef.current?.scrollBy({ left: delta * 120, behavior: "smooth" });
};
```

Render:
- `aria-label="上一类型"` / `aria-label="下一类型"` arrow buttons
- scrollable chip track ref

Add CSS:
- hide vertical overflow
- single-line horizontal rail with `overflow-x: auto; white-space: nowrap;`

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/TimeManagerPage.tsx src/styles.css src/components/TimeManagerPage.test.tsx
git commit -m "feat(time): add horizontal scroll and arrow switching for todo types"
```

### Task 4: 分类条右侧 + 新类型（就地创建）

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Test: `src/components/TimeManagerPage.test.tsx`

**Step 1: Write the failing test**

```tsx
it("creates new type from pool rail and auto-selects it", async () => {
  render(<TimeManagerPage todos={seedTodos} timelineItems={[]} />);
  await user.click(screen.getByRole("button", { name: "+ 新类型" }));
  await user.type(screen.getByPlaceholderText("输入类型名"), "阅读");
  await user.click(screen.getByRole("button", { name: "确认" }));
  expect(screen.getByRole("button", { name: "阅读" })).toHaveClass("active");
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: FAIL because create type UI does not exist

**Step 3: Write minimal implementation**

```tsx
const [showCreateTypeInline, setShowCreateTypeInline] = useState(false);
const [newTypeName, setNewTypeName] = useState("");

const createType = (): void => {
  const result = canCreateTodoType(newTypeName, todoTypes);
  if (!result.ok || !result.value) return;
  setTodoTypes((prev) => [...prev, result.value!]);
  setSelectedTodoType(result.value);
  setNewTypeName("");
  setShowCreateTypeInline(false);
};
```

Render:
- rail right action button `+ 新类型`
- inline input + confirm/cancel
- lightweight error text for empty/duplicate/too_long

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/TimeManagerPage.tsx src/styles.css src/components/TimeManagerPage.test.tsx
git commit -m "feat(time): support inline todo type creation in pool rail"
```

### Task 5: 新建任务改为弹窗 + 类型下拉

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Test: `src/components/TimeManagerPage.test.tsx`

**Step 1: Write the failing test**

```tsx
it("creates todo from modal using selected type dropdown", async () => {
  render(<TimeManagerPage todos={[]} timelineItems={[]} />);
  await user.click(screen.getByRole("button", { name: "+ 新建任务" }));
  await user.type(screen.getByPlaceholderText("例如：完成开发日报"), "写周报");
  await user.selectOptions(screen.getByLabelText("类型"), "工作");
  await user.click(screen.getByRole("button", { name: "创建待办" }));
  expect(screen.getByText("写周报")).toBeInTheDocument();
  expect(screen.getByText("工作")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: FAIL because create modal does not exist

**Step 3: Write minimal implementation**

- Remove inline `.todo-create-form` rendering.
- Add pool header button `+ 新建任务` opening modal state.
- Modal fields:
  - title input
  - duration input
  - detail textarea
  - type select (options from `todoTypes`)
- On submit:
  - validate `canCreateTodo(newTodoTitle)`
  - write selected type into `project`
  - close modal + clear form

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/TimeManagerPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/TimeManagerPage.tsx src/styles.css src/components/TimeManagerPage.test.tsx
git commit -m "feat(time): replace quick create form with modal and type dropdown"
```

### Task 6: 回归验证与文档同步

**Files:**
- Modify: `docs/plans/2026-02-27-time-manager-todo-type-filter-modal-design.md` (如需补充实现偏差)

**Step 1: Run focused tests**

Run: `npm run test -- src/components/todoTypeModel.test.ts src/components/TimeManagerPage.test.tsx`
Expected: PASS

**Step 2: Run broader suite (time manager related)**

Run: `npm run test -- src/components/timeManager* src/components/TimeManagerPage*`
Expected: PASS

**Step 3: Manual verification checklist**

- 待办池类型条可滚动、可左右箭头切换。
- 列表仅显示当前类型。
- 新类型创建成功后自动选中。
- 新建任务弹窗的类型下拉可选并正确写入。
- 默认类型为“通用”，历史空值可在“通用”中看到。

**Step 4: Commit**

```bash
git add docs/plans/2026-02-27-time-manager-todo-type-filter-modal-design.md
git commit -m "docs: sync design notes after implementation verification"
```
