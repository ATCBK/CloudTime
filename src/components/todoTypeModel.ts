import { TodoItem } from "../types";

export const DEFAULT_TODO_TYPE = "通用";
const MAX_TODO_TYPE_LENGTH = 20;

export function normalizeTodoType(raw?: string | null, defaultType: string = DEFAULT_TODO_TYPE): string {
  const value = (raw ?? "").trim();
  return value ? value : defaultType;
}

export function buildTodoTypesFromTodos(
  todos: TodoItem[],
  extraTypes: string[] = [],
  defaultType: string = DEFAULT_TODO_TYPE
): string[] {
  const unique = new Set<string>([defaultType]);
  extraTypes.forEach((type) => unique.add(normalizeTodoType(type, defaultType)));
  todos.forEach((todo) => unique.add(normalizeTodoType(todo.project, defaultType)));
  const list = Array.from(unique).filter(Boolean);
  return [defaultType, ...list.filter((item) => item !== defaultType)];
}

export function canCreateTodoType(
  raw: string,
  existing: string[]
): { ok: true; value: string } | { ok: false; reason: "empty" | "duplicate" | "too_long" } {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "empty" };
  if (value.length > MAX_TODO_TYPE_LENGTH) return { ok: false, reason: "too_long" };
  const key = value.toLocaleLowerCase();
  const hasDuplicate = existing.some((item) => item.trim().toLocaleLowerCase() === key);
  if (hasDuplicate) return { ok: false, reason: "duplicate" };
  return { ok: true, value };
}
