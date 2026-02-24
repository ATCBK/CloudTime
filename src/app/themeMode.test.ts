import { describe, expect, test } from "vitest";
import { getNextManualThemeMode, resolveEffectiveTheme } from "./themeMode";

describe("resolveEffectiveTheme", () => {
  test("returns explicit light/dark overrides", () => {
    expect(resolveEffectiveTheme("light", true)).toBe("light");
    expect(resolveEffectiveTheme("dark", false)).toBe("dark");
  });

  test("follows system theme when mode is system", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark");
    expect(resolveEffectiveTheme("system", false)).toBe("light");
  });
});

describe("getNextManualThemeMode", () => {
  test("toggles between light and dark when mode is explicit", () => {
    expect(getNextManualThemeMode("light", false)).toBe("dark");
    expect(getNextManualThemeMode("dark", true)).toBe("light");
  });

  test("uses effective system mode and flips to manual opposite", () => {
    expect(getNextManualThemeMode("system", true)).toBe("light");
    expect(getNextManualThemeMode("system", false)).toBe("dark");
  });
});
