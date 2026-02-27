import { marked } from "marked";
import { sanitizeClipboardHtmlForNotes } from "./notePasteFallback";

const MARKDOWN_FEATURE_RE = /(^|\n)\s{0,3}(#{1,6}\s|>\s|[-*+]\s+\[[ xX]\]\s|[-*+]\s+|```|~~~|\|.+\|\s*$|\d+\.\s+)/m;

export function shouldPreferMarkdownPlainText(plainText: string): boolean {
  const normalized = (plainText || "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return false;
  return MARKDOWN_FEATURE_RE.test(normalized);
}

export function markdownPlainTextToSanitizedHtml(plainText: string): string {
  const normalized = (plainText || "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return "<p><br></p>";

  const rawHtml = String(marked.parse(normalized, { gfm: true, breaks: true }));
  return sanitizeClipboardHtmlForNotes(rawHtml, normalized, {
    preserveHeadings: true,
    allowTables: true,
    allowTaskCheckbox: true,
    disablePlainTextLineFallback: true
  });
}
