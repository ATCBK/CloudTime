import { describe, expect, it } from "vitest";
import { buildDiskNoteEntries, htmlToMarkdown } from "./mdStorage";

describe("mdStorage", () => {
  it("converts basic rich text html into markdown", () => {
    const markdown = htmlToMarkdown("<h1>标题</h1><p><strong>加粗</strong>与<a href=\"https://example.com\">链接</a></p><ul><li>事项A</li><li>事项B</li></ul>");

    expect(markdown).toContain("# 标题");
    expect(markdown).toContain("**加粗**");
    expect(markdown).toContain("[链接](https://example.com)");
    expect(markdown).toContain("- 事项A");
  });

  it("deduplicates exported note paths", () => {
    const entries = buildDiskNoteEntries([
      { title: "周报.md", contentHtml: "<p>一</p>", folderPath: ["工作"], updatedAt: Date.now() },
      { title: "周报.md", contentHtml: "<p>二</p>", folderPath: ["工作"], updatedAt: Date.now() }
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0].fileName).toBe("周报.md");
    expect(entries[1].fileName).toBe("周报 (2).md");
    expect(entries[0].relativeDir).toBe(entries[1].relativeDir);
    expect(entries[0].content).toContain("一");
    expect(entries[1].content).toContain("二");
  });
});
