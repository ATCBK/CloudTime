import { describe, expect, it } from "vitest";
import { TimelineItem, TodoItem } from "../types";
import { buildQuickPanelItems, removeTodoAfterSchedule } from "./quickPanelState";

describe("quickPanelState", () => {
  it("builds sorted quick panel items for selected date", () => {
    const todos: TodoItem[] = [
      { id: "t1", title: "A", project: "P", durationMinutes: 30, completed: false },
      { id: "t2", title: "B", project: "P", durationMinutes: 30, completed: true, details: "done" }
    ];

    const scheduled: Array<TimelineItem & { date: string }> = [
      { id: "s2", todoId: "t2", title: "B", project: "P", startHour: 10, startMinute: 0, endHour: 10, endMinute: 30, date: "2026-02-23" },
      { id: "s1", todoId: "t1", title: "A", project: "P", startHour: 9, startMinute: 0, endHour: 9, endMinute: 30, date: "2026-02-23" },
      { id: "s3", todoId: "t1", title: "A", project: "P", startHour: 8, startMinute: 0, endHour: 8, endMinute: 30, date: "2026-02-24" }
    ];

    const items = buildQuickPanelItems(scheduled, todos, "2026-02-23");

    expect(items).toHaveLength(2);
    expect(items[0].scheduleId).toBe("s1");
    expect(items[1].scheduleId).toBe("s2");
    expect(items[1].completed).toBe(true);
    expect(items[1].details).toBe("done");
  });

  it("removes todo from pool after scheduling", () => {
    const todos: TodoItem[] = [
      { id: "t1", title: "A", project: "P", durationMinutes: 30, completed: false },
      { id: "t2", title: "B", project: "P", durationMinutes: 30, completed: false }
    ];

    const next = removeTodoAfterSchedule(todos, "t1");
    expect(next.map((t) => t.id)).toEqual(["t2"]);
  });

  it("uses schedule fallback details and completion when todo no longer in pool", () => {
    const items = buildQuickPanelItems(
      [
        {
          id: "s1",
          todoId: "missing",
          title: "A",
          project: "P",
          startHour: 9,
          startMinute: 0,
          endHour: 9,
          endMinute: 30,
          date: "2026-02-23",
          completed: true,
          details: "from schedule"
        }
      ],
      [],
      "2026-02-23"
    );

    expect(items[0].completed).toBe(true);
    expect(items[0].details).toBe("from schedule");
  });
});
