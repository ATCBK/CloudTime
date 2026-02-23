import { describe, expect, it } from "vitest";
import { boundRange, computeAutoScrollDelta, pointerToSnappedRange, snapToStep } from "./timeDragMath";

describe("timeDragMath", () => {
  it("snaps minute to 15 minute step", () => {
    expect(snapToStep(7, 15)).toBe(0);
    expect(snapToStep(8, 15)).toBe(15);
    expect(snapToStep(37, 15)).toBe(30);
    expect(snapToStep(53, 15)).toBe(60);
  });

  it("bounds range inside timeline", () => {
    expect(boundRange(-20, 60, 840)).toEqual({ start: 0, end: 60 });
    expect(boundRange(810, 60, 840)).toEqual({ start: 780, end: 840 });
  });

  it("computes auto scroll when pointer is near edges", () => {
    expect(computeAutoScrollDelta(10, 600, 48, 16)).toBeLessThan(0);
    expect(computeAutoScrollDelta(590, 600, 48, 16)).toBeGreaterThan(0);
    expect(computeAutoScrollDelta(300, 600, 48, 16)).toBe(0);
  });

  it("maps pointer to snapped drop range", () => {
    expect(pointerToSnappedRange(121, 60, 840, 56, 15)).toEqual({ start: 135, end: 195 });
  });

  it("maps deep scroll pointer to late-day range for full-day timeline", () => {
    // 23:50 in a 24h timeline should snap near the day end and stay bounded.
    expect(pointerToSnappedRange((23 * 56) + 46, 60, 1440, 56, 15)).toEqual({ start: 1380, end: 1440 });
  });
});
