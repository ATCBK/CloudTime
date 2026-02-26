import { describe, expect, it } from "vitest";
import { CONTEXT_SELECTION_ACTIONS, FLOATING_SELECTION_ACTIONS, SELECTION_BLOCK_MENU_COMPACT } from "./notesSelectionActions";

describe("notesSelectionActions", () => {
  it("keeps context actions aligned with floating actions", () => {
    expect(CONTEXT_SELECTION_ACTIONS).toEqual(FLOATING_SELECTION_ACTIONS);
    expect(CONTEXT_SELECTION_ACTIONS).toContain("underline");
  });

  it("uses full block menu for selection to match top toolbar", () => {
    expect(SELECTION_BLOCK_MENU_COMPACT).toBe(false);
  });
});
