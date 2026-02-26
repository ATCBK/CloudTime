import { describe, expect, it } from "vitest";
import { markdownToBasicHtml, resolveInitialLightNoteHtml, sanitizeLightNoteHtml } from "./lightNoteRichText";

describe("lightNoteRichText", () => {
  it("converts legacy markdown into basic html", () => {
    const html = markdownToBasicHtml("# 当天轻笔记\n\n- 第一项\n- 第二项\n\n普通文本");
    expect(html).toContain("<strong>当天轻笔记</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>第一项</li>");
    expect(html).toContain("<p>普通文本</p>");
  });

  it("sanitizes dangerous html and keeps safe tags", () => {
    const raw = '<p onclick="alert(1)">ok</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
    const html = sanitizeLightNoteHtml(raw);
    expect(html).toContain("<p>ok</p>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).toContain('href="#"');
  });

  it("resolves initial html using current html first", () => {
    expect(resolveInitialLightNoteHtml("<p>ready</p>", "# old")).toContain("ready");
  });

  it("falls back to legacy markdown when html is empty", () => {
    const html = resolveInitialLightNoteHtml("", "- a\n- b");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a</li>");
  });

  it("keeps safe task reference card markup", () => {
    const raw = '<div class="ln-task-card" data-task-id="t1" contenteditable="false"><div class="ln-task-title">A</div></div>';
    const html = sanitizeLightNoteHtml(raw);
    expect(html).toContain('class="ln-task-card"');
    expect(html).toContain('data-task-id="t1"');
    expect(html).toContain('contenteditable="false"');
    expect(html).toContain('class="ln-task-title"');
  });
});
