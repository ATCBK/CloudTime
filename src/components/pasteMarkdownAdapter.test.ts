import { describe, expect, it } from "vitest";
import { markdownPlainTextToSanitizedHtml, shouldPreferMarkdownPlainText } from "./pasteMarkdownAdapter";

describe("pasteMarkdownAdapter", () => {
  it("detects markdown-like plain text", () => {
    expect(shouldPreferMarkdownPlainText("### 标题\n- [ ] 任务")).toBe(true);
    expect(shouldPreferMarkdownPlainText("普通段落，没有 markdown 特征")).toBe(false);
  });

  it("renders rich markdown blocks for plain text paste", () => {
    const markdown = [
      "### 标题",
      "",
      "- [x] 完成任务",
      "- [ ] 未完成任务",
      "",
      "> 引用段落",
      "",
      "```ts",
      "const n = 1;",
      "```",
      "",
      "| 列1 | 列2 |",
      "| --- | --- |",
      "| A | B |"
    ].join("\n");

    const html = markdownPlainTextToSanitizedHtml(markdown);
    expect(html).toContain("<h3>标题</h3>");
    expect(html).toContain('<input type="checkbox" disabled checked>');
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code");
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
  });
});
