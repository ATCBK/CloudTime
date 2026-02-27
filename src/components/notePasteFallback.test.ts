import { describe, expect, it } from "vitest";
import { sanitizeClipboardHtmlForNotes } from "./notePasteFallback";

describe("notePasteFallback", () => {
  it("strips unsafe inline styles and placeholder blocks", () => {
    const raw = '<div style="background:#fff;height:40px">&nbsp;</div><p style="color:#111;background:#fff">Body</p>';
    const html = sanitizeClipboardHtmlForNotes(raw, "Body");
    expect(html).toContain("Body");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("background:#fff");
  });

  it("keeps basic semantic tags and safe links", () => {
    const raw = '<ul><li><b>Item</b></li></ul><a href="javascript:alert(1)">x</a><code>uvicorn</code>';
    const html = sanitizeClipboardHtmlForNotes(raw, "Item x uvicorn");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li><strong>Item</strong></li>");
    expect(html).toContain('href="#"');
    expect(html).toContain("<code>uvicorn</code>");
  });

  it("falls back to plain text when html is empty/invalid", () => {
    const html = sanitizeClipboardHtmlForNotes("<meta><style>x</style>", "Line 1\nLine 2");
    expect(html).toContain("Line 1");
    expect(html).toContain("Line 2");
    expect(html).toContain("<p>");
  });

  it("keeps block structure from div based clipboard html", () => {
    const raw = "<div><span>Line A</span></div><div><span>Line B</span></div>";
    const html = sanitizeClipboardHtmlForNotes(raw, "Line A\nLine B");
    expect(html).toContain("<p>Line A</p>");
    expect(html).toContain("<p>Line B</p>");
  });

  it("preserves strong emphasis from style driven span", () => {
    const raw = '<p><span style="font-weight:700">Heading</span> body</p>';
    const html = sanitizeClipboardHtmlForNotes(raw, "Heading body");
    expect(html).toContain("<strong>Heading</strong>");
  });

  it("downgrades pasted heading tags to paragraph by default", () => {
    const raw = "<h2>A</h2><h3>B</h3>";
    const html = sanitizeClipboardHtmlForNotes(raw, "A\nB");
    expect(html).toContain("<p>A</p>");
    expect(html).toContain("<p>B</p>");
    expect(html).not.toContain("<h2>");
    expect(html).not.toContain("<h3>");
  });

  it("keeps headings, table and task checkbox when extended options are enabled", () => {
    const raw = "<h3>Title</h3><ul><li><input type=\"checkbox\" checked disabled>Done</li></ul><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>";
    const html = sanitizeClipboardHtmlForNotes(raw, "Title\n- [x] Done", {
      preserveHeadings: true,
      allowTables: true,
      allowTaskCheckbox: true
    });
    expect(html).toContain("<h3>Title</h3>");
    expect(html).toContain('<input type="checkbox" disabled checked>');
    expect(html).toContain("<table>");
  });
});

