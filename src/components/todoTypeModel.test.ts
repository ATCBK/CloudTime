import { describe, expect, it } from "vitest";
import { buildTodoTypesFromTodos, canCreateTodoType, DEFAULT_TODO_TYPE, normalizeTodoType } from "./todoTypeModel";

describe("todoTypeModel", () => {
  it("normalizes empty type to default", () => {
    expect(normalizeTodoType("")).toBe(DEFAULT_TODO_TYPE);
    expect(normalizeTodoType("   ")).toBe(DEFAULT_TODO_TYPE);
    expect(normalizeTodoType("", "默认")).toBe("默认");
  });

  it("builds deduplicated type list and keeps default first", () => {
    const types = buildTodoTypesFromTodos([
      { id: "1", title: "A", project: "工作", durationMinutes: 30, completed: false },
      { id: "2", title: "B", project: " 通用 ", durationMinutes: 45, completed: false },
      { id: "3", title: "C", project: "", durationMinutes: 60, completed: false }
    ], ["学习", "工作"]);

    expect(types[0]).toBe(DEFAULT_TODO_TYPE);
    expect(types).toContain("工作");
    expect(types).toContain("学习");
  });

  it("supports custom default type as protected root", () => {
    const types = buildTodoTypesFromTodos([], [], "自定义通用");
    expect(types).toEqual(["自定义通用"]);
  });

  it("validates create type rules", () => {
    expect(canCreateTodoType("", [DEFAULT_TODO_TYPE]).ok).toBe(false);
    expect(canCreateTodoType(DEFAULT_TODO_TYPE, [DEFAULT_TODO_TYPE]).ok).toBe(false);
    expect(canCreateTodoType("新类型", [DEFAULT_TODO_TYPE]).ok).toBe(true);
  });
});
