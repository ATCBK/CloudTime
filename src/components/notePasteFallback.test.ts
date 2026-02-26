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

  it("downgrades pasted heading tags to paragraph to avoid false title rendering", () => {
    const raw = "<h2>普通正文 A</h2><h3>普通正文 B</h3>";
    const html = sanitizeClipboardHtmlForNotes(raw, "普通正文 A\n普通正文 B");
    expect(html).toContain("<p>普通正文 A</p>");
    expect(html).toContain("<p>普通正文 B</p>");
    expect(html).not.toContain("<h2>");
    expect(html).not.toContain("<h3>");
  });

  it("falls back to plain text when html keeps only first block but plain text has multiple lines", () => {
    const raw = "<h2>第一行</h2><custom-block>第二行</custom-block><custom-block>第三行</custom-block>";
    const html = sanitizeClipboardHtmlForNotes(raw, "第一行\n第二行\n第三行");
    expect(html).toContain("<p>第一行</p>");
    expect(html).toContain("<p>第二行</p>");
    expect(html).toContain("<p>第三行</p>");
  });

  it("falls back to plain text paragraphs when unknown wrappers collapse multiline content", () => {
    const raw = "<p>行一</p><x-row>行二</x-row><x-row>行三</x-row><x-row>行四</x-row>";
    const html = sanitizeClipboardHtmlForNotes(raw, "行一\n行二\n行三\n行四");
    expect(html).toBe("<p>行一</p><p>行二</p><p>行三</p><p>行四</p>");
  });
});
