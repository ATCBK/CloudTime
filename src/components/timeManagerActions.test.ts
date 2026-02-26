import { describe, expect, it } from "vitest";
import { buildTaskReferenceCardHtml, buildTaskReferenceDropHtml, scheduleToTodoCandidate, toggleTodoCompleted } from "./timeManagerActions";

describe("timeManagerActions", () => {
  it("builds todo candidate from timeline schedule", () => {
    const todo = scheduleToTodoCandidate({
      title: "架构评审",
      project: "Cloudo",
      startHour: 9,
      startMinute: 30,
      endHour: 10,
      endMinute: 30
    });

    expect(todo.title).toBe("架构评审");
    expect(todo.project).toBe("Cloudo");
    expect(todo.durationMinutes).toBe(60);
    expect(todo.details).toContain("09:30-10:30");
  });

  it("builds rich note reference card html", () => {
    const html = buildTaskReferenceCardHtml({
      taskId: "t_1",
      title: "云朵开发",
      project: "Project A",
      timeLabel: "10:00-11:00"
    });

    expect(html).toContain("ln-task-card");
    expect(html).toContain('contenteditable="false"');
    expect(html).toContain("云朵开发");
    expect(html).toContain("Project A");
    expect(html).toContain("10:00-11:00");
  });

  it("builds drop html with a trailing editable paragraph", () => {
    const html = buildTaskReferenceDropHtml({
      taskId: "t_1",
      title: "云朵开发",
      project: "Project A",
      timeLabel: "10:00-11:00"
    });

    expect(html).toContain('contenteditable="false"');
    expect(html).toContain("<p><br></p>");
  });

  it("toggles todo completion", () => {
    expect(toggleTodoCompleted(true)).toBe(false);
    expect(toggleTodoCompleted(false)).toBe(true);
  });

  it("keeps existing details when restoring todo from timeline", () => {
    const todo = scheduleToTodoCandidate({
      title: "复盘",
      project: "Cloudo",
      startHour: 14,
      startMinute: 0,
      endHour: 14,
      endMinute: 45,
      details: "已有详情"
    });

    expect(todo.details).toBe("已有详情");
  });
});
