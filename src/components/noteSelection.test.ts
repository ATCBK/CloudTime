import { describe, expect, it } from "vitest";
import { resolveNextCurrentNoteId } from "./noteSelection";

describe("noteSelection", () => {
  it("keeps current note when switching selected folder without clicking a file", () => {
    const notes = [
      { id: "a1", folderId: "A" },
      { id: "b1", folderId: "B" }
    ];

    const next = resolveNextCurrentNoteId(notes, "B", "a1");
    expect(next).toBe("a1");
  });

  it("falls back to first note in selected folder when current note is missing", () => {
    const notes = [
      { id: "a1", folderId: "A" },
      { id: "b1", folderId: "B" },
      { id: "b2", folderId: "B" }
    ];

    const next = resolveNextCurrentNoteId(notes, "B", "missing");
    expect(next).toBe("b1");
  });
});

