import { describe, expect, test } from "vitest";
import { pathToPage, pageToPath } from "./navigation";

describe("navigation mapping", () => {
  test("maps page to path", () => {
    expect(pageToPath("time_manager")).toBe("/time");
    expect(pageToPath("notes")).toBe("/notes");
    expect(pageToPath("settings")).toBe("/settings");
  });

  test("maps path to page with fallback", () => {
    expect(pathToPage("/time")).toBe("time_manager");
    expect(pathToPage("/notes")).toBe("notes");
    expect(pathToPage("/settings")).toBe("settings");
    expect(pathToPage("/")).toBe("time_manager");
    expect(pathToPage("/unknown")).toBe("time_manager");
  });
});
