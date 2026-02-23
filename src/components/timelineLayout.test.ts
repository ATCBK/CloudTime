import { describe, expect, it } from "vitest";
import { computeLaneWidth, computeTimelineUsableWidth } from "./timelineLayout";

describe("timelineLayout", () => {
  it("computes usable width from timeline container width", () => {
    expect(computeTimelineUsableWidth(1200, 8, 58, 120)).toBe(1126);
  });

  it("keeps minimum width when width is temporarily zero", () => {
    expect(computeTimelineUsableWidth(0, 8, 58, 120)).toBe(120);
  });

  it("adapts lane width to available space", () => {
    const usable = computeTimelineUsableWidth(1200, 8, 58, 120);
    expect(computeLaneWidth(usable, 1, 6, 120)).toBe(1126);
    expect(computeLaneWidth(usable, 2, 6, 120)).toBe(560);
  });
});
