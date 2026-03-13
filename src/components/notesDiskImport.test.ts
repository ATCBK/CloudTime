import { describe, expect, it } from "vitest";
import { buildNotesImportModel, DiskMdEntry } from "./notesDiskImport";

describe("notesDiskImport", () => {
  it("builds folder tree and notes from markdown files", () => {
    const entries: DiskMdEntry[] = [
      { relativeDir: "", fileName: "root.md", content: "# Root", updatedAt: 1 },
      { relativeDir: "Work/ProjectA", fileName: "plan.md", content: "content", updatedAt: 2 },
      { relativeDir: "Work", fileName: "todo.md", content: "todo", updatedAt: 3 }
    ];

    const model = buildNotesImportModel(entries, (value) => `<p>${value}</p>`);

    expect(model.folders.length).toBe(1);
    expect(model.folders[0].name).toBe("本地笔记");
    expect(model.notes.length).toBe(3);
    expect(model.currentNoteId).toBeTruthy();
    expect(model.expandedFolderIds.length).toBeGreaterThan(1);

    const hasWorkNote = model.notes.some((item) => item.title === "todo.md");
    const hasNestedNote = model.notes.some((item) => item.title === "plan.md");
    expect(hasWorkNote).toBe(true);
    expect(hasNestedNote).toBe(true);
  });
});
