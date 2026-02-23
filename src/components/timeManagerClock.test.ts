import { describe, expect, it } from "vitest";
import {
  buildHourSlots24,
  computeMinuteOfDay,
  computeMsUntilNextMidnight,
  computeMsUntilTodayRecycle,
  computeNowLineTop,
  isSameDateKey,
  parseQuickTimeInput,
  toggleWeekExpandedDate
} from "./timeManagerClock";

describe("timeManagerClock", () => {
  it("builds full day hour slots", () => {
    const slots = buildHourSlots24();
    expect(slots).toHaveLength(24);
    expect(slots[0]).toBe(0);
    expect(slots[23]).toBe(23);
  });

  it("computes minute of day", () => {
    const d = new Date(2026, 1, 23, 13, 45, 0, 0);
    expect(computeMinuteOfDay(d)).toBe(13 * 60 + 45);
  });

  it("computes ms until next midnight", () => {
    const d = new Date(2026, 1, 23, 23, 59, 0, 0);
    expect(computeMsUntilNextMidnight(d)).toBe(60 * 1000);
  });

  it("computes now line top by minute and px per hour", () => {
    expect(computeNowLineTop(90, 56)).toBeCloseTo(84);
  });

  it("toggles week expanded date", () => {
    expect(toggleWeekExpandedDate(null, "2026-02-23")).toBe("2026-02-23");
    expect(toggleWeekExpandedDate("2026-02-23", "2026-02-23")).toBe(null);
    expect(toggleWeekExpandedDate("2026-02-23", "2026-02-24")).toBe("2026-02-24");
  });

  it("parses quick time input", () => {
    expect(parseQuickTimeInput("09:30")).toEqual({ startMinute: 570, endMinute: 630 });
    expect(parseQuickTimeInput("09:30-10:15")).toEqual({ startMinute: 570, endMinute: 615 });
    expect(parseQuickTimeInput("xx")).toBeNull();
  });

  it("computes ms until 23:59 recycle checkpoint", () => {
    const d = new Date(2026, 1, 23, 23, 58, 0, 0);
    expect(computeMsUntilTodayRecycle(d)).toBe(60 * 1000);
  });

  it("rolls recycle checkpoint to next day when already passed", () => {
    const d = new Date(2026, 1, 23, 23, 59, 30, 0);
    expect(computeMsUntilTodayRecycle(d)).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("compares date key safely", () => {
    expect(isSameDateKey("2026-02-23", "2026-02-23")).toBe(true);
    expect(isSameDateKey("2026-02-23", "2026-02-24")).toBe(false);
  });
});
