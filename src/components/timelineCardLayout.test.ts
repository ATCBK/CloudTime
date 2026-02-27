import { describe, expect, it } from "vitest";
import { getTimelineCardDensity } from "./timelineCardLayout";

describe("timelineCardLayout", () => {
  it("uses compact layout for 60 minutes and below", () => {
    expect(getTimelineCardDensity(15)).toBe("compact");
    expect(getTimelineCardDensity(45)).toBe("compact");
    expect(getTimelineCardDensity(60)).toBe("compact");
  });

  it("uses regular layout for durations above 60 minutes", () => {
    expect(getTimelineCardDensity(75)).toBe("regular");
    expect(getTimelineCardDensity(120)).toBe("regular");
  });
});
