import { describe, expect, it } from "vitest";
import { formatExplosiveCardTitle, getIncompleteTodoIds } from "./explosiveGrowthCardModel";

describe("explosiveGrowthCardModel", () => {
  it("formats title with month and date", () => {
    expect(formatExplosiveCardTitle(new Date(2026, 1, 23))).toBe("2月23日任务");
  });

  it("collects incomplete unique todo ids", () => {
    const ids = getIncompleteTodoIds([
      { todoId: "a", completed: false },
      { todoId: "a", completed: false },
      { todoId: "b", completed: true },
      { todoId: "c", completed: false }
    ]);
    expect(ids).toEqual(["a", "c"]);
  });
});

