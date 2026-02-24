import { describe, expect, it } from "vitest";
import { isQuickPanelViewSearch } from "./quickPanelView";

describe("quickPanelView", () => {
  it("detects quick-panel query", () => {
    expect(isQuickPanelViewSearch("?view=quick-panel")).toBe(true);
    expect(isQuickPanelViewSearch("?view=main")).toBe(false);
    expect(isQuickPanelViewSearch("")).toBe(false);
  });
});

