import { describe, expect, it } from "vitest";
import { TIME_MANAGER_PALETTE } from "./timeManagerPalette";

describe("timeManagerPalette", () => {
  it("exports required brand tokens with exact values", () => {
    expect(TIME_MANAGER_PALETTE).toEqual({
      brandBlue: "#10246C",
      brandYellow: "#FFD700",
      bgSky: "#FFFFFF",
      bgPanel: "#FFFFFF",
      statusSuccess: "#34D399",
      statusError: "#F87171"
    });
  });
});
