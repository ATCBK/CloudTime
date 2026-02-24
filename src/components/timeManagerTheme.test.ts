import { describe, expect, it } from "vitest";
import { formatClockPill, getGreetingLabel } from "./timeManagerTheme";

describe("timeManagerTheme", () => {
  it("returns greeting by hour", () => {
    expect(getGreetingLabel(8)).toContain("早");
    expect(getGreetingLabel(14)).toContain("午");
    expect(getGreetingLabel(20)).toContain("晚");
  });

  it("formats clock pill with am/pm", () => {
    const morning = new Date(2026, 1, 23, 10, 45, 0, 0);
    const evening = new Date(2026, 1, 23, 21, 5, 0, 0);
    expect(formatClockPill(morning)).toBe("10:45 上午");
    expect(formatClockPill(evening)).toBe("9:05 下午");
  });
});
