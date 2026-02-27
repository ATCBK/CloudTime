import { TodoItem } from "../types";

export const DEFAULT_TODO_TYPE = "通用";
const MAX_TODO_TYPE_LENGTH = 20;

export function normalizeTodoType(raw?: string | null): string {
  const value = (raw ?? "").trim();
  return value ? value : DEFAULT_TODO_TYPE;
}

export function buildTodoTypesFromTodos(todos: TodoItem[], extraTypes: string[] = []): string[] {
  const unique = new Set<string>([DEFAULT_TODO_TYPE]);
  extraTypes.forEach((type) => unique.add(normalizeTodoType(type)));
  todos.forEach((todo) => unique.add(normalizeTodoType(todo.project)));
  const list = Array.from(unique).filter(Boolean);
  return [DEFAULT_TODO_TYPE, ...list.filter((item) => item !== DEFAULT_TODO_TYPE)];
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
