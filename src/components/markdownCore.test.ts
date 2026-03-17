import { describe, expect, it } from "vitest";
import {
  hasLightNoteContent,
  isLikelyMarkdown,
  markdownToSanitizedHtml,
  resolveInitialLightNoteHtml,
  sanitizeNoteEditorHtml,
  sanitizeLightNoteHtml,
  sanitizePastedHtml
} from "./markdownCore";

describe("markdownCore", () => {
  it("detects markdown-like text", () => {
    expect(isLikelyMarkdown("### 标题\n- [ ] 任务")).toBe(true);
    expect(isLikelyMarkdown("普通段落，没有 markdown 特征")).toBe(false);
  });

  it("sanitizes pasted html and preserves safe semantics", () => {
    const raw = '<ul><li><b>Item</b></li></ul><a href="javascript:alert(1)">x</a><code>uvicorn</code>';
    const html = sanitizePastedHtml(raw, "Item x uvicorn");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li><strong>Item</strong></li>");
    expect(html).toContain('href="#"');
    expect(html).toContain("<code>uvicorn</code>");
  });

  it("renders markdown into sanitized rich html", () => {
    const markdown = ["### 标题", "", "- [x] Done", "", "| A | B |", "| --- | --- |", "| 1 | 2 |"].join("\n");
    const html = markdownToSanitizedHtml(markdown);
    expect(html).toContain("<h3>标题</h3>");
    expect(html).toContain('<input type="checkbox" disabled checked');
    expect(html).toContain("<table>");
  });

  it("sanitizes light note html and keeps task card metadata", () => {
    const raw = '<div class="ln-task-card" data-task-id="t1" contenteditable="false"><div class="ln-task-title">A</div></div>';
    const html = sanitizeLightNoteHtml(raw);
    expect(html).toContain('class="ln-task-card"');
    expect(html).toContain('data-task-id="t1"');
    expect(html).toContain('contenteditable="false"');
    expect(html).toContain('class="ln-task-title"');
  });

  it("supports legacy markdown bootstrap and content detection", () => {
    const html = resolveInitialLightNoteHtml("", "- a\n- b");
    expect(html).toContain("<ul>");
    expect(hasLightNoteContent("")).toBe(false);
    expect(hasLightNoteContent("<p><br></p>")).toBe(false);
    expect(hasLightNoteContent("<p>计划A</p>")).toBe(true);
  });

  it("hardens note editor html before preview render", () => {
    const raw = '<p onclick="alert(1)">ok</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
    const html = sanitizeNoteEditorHtml(raw);
    expect(html).toContain("<p>ok</p>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).toContain('href="#"');
  });
});
