import { describe, expect, it } from "vitest";
import { canCreateTodo, removeScheduleWithSnapshot, undoRemovedSchedule } from "./timeManagerSafety";

interface Item {
  id: string;
  title: string;
}

describe("timeManagerSafety", () => {
  it("guards create action by title", () => {
    expect(canCreateTodo("")).toBe(false);
    expect(canCreateTodo("   ")).toBe(false);
    expect(canCreateTodo("完成开发日报")).toBe(true);
  });

  it("removes schedule and returns snapshot", () => {
    const source: Item[] = [
      { id: "a", title: "A" },
      { id: "b", title: "B" }
    ];
    const result = removeScheduleWithSnapshot(source, "a");
    expect(result.removed?.id).toBe("a");
    expect(result.next.map((item) => item.id)).toEqual(["b"]);
  });

  it("undo restores item and prevents duplicates", () => {
    const source: Item[] = [{ id: "b", title: "B" }];
    const removed: Item = { id: "a", title: "A" };
    expect(undoRemovedSchedule(source, removed).map((item) => item.id)).toEqual(["a", "b"]);
    expect(undoRemovedSchedule([{ id: "a", title: "A" }], removed).map((item) => item.id)).toEqual(["a"]);
  });
});

