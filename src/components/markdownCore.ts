import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

type Attribs = Record<string, string>;

const BASE_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6"
] as const;

const LIGHT_NOTE_ALLOWED_TAGS = [...BASE_ALLOWED_TAGS, "table", "thead", "tbody", "tr", "th", "td", "input", "div", "span"] as const;

const MARKDOWN_FEATURE_RE = /(^|\n)\s{0,3}(#{1,6}\s|>\s|[-*+]\s+\[[ xX]\]\s|[-*+]\s+|```|~~~|\|.+\|\s*$|\d+\.\s+)/m;

export interface SanitizeOptions {
  preserveHeadings?: boolean;
  allowTables?: boolean;
  allowTaskCheckbox?: boolean;
  disablePlainTextLineFallback?: boolean;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(input: string): string {
  const normalized = (input || "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
  if (!normalized) return "<p><br></p>";
  return normalized
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<p><br></p>";
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join("");
}

function countMeaningfulLines(input: string): number {
  const normalized = (input || "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
  if (!normalized) return 0;
  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function countSanitizedBlockBoundaries(html: string): number {
  if (!html) return 0;
  const blocks = html.match(/<(p|li|blockquote|pre|h1|h2|h3|h4)\b/gi)?.length ?? 0;
  const breaks = html.match(/<br\s*\/?>/gi)?.length ?? 0;
  return blocks + breaks;
}

function preprocessRichText(source: string, preserveHeadings: boolean): string {
  let out = source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|meta|link|xml)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|meta|link|xml)[^>]*\/?\s*>/gi, "")
    .replace(/<\s*o:p[^>]*>[\s\S]*?<\s*\/\s*o:p\s*>/gi, "")
    .replace(/\u200b/g, "")
    .replace(/&nbsp;/gi, " ");

  out = out
    .replace(/<\s*\/?\s*(html|body|font)[^>]*>/gi, "")
    .replace(/<\s*(div|section|article|header|footer|main|aside)[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*(div|section|article|header|footer|main|aside)\s*>/gi, "</p>");

  if (!preserveHeadings) {
    out = out
      .replace(/<\s*h[1-6][^>]*>/gi, "<p>")
      .replace(/<\s*\/\s*h[1-6]\s*>/gi, "</p>");
  }

  // Preserve semantic emphasis from style-heavy spans (Feishu/Word/web copy).
  out = out.replace(/<span([^>]*)>([\s\S]*?)<\/span>/gi, (_full, rawAttrs: string, inner: string) => {
    const styleMatch = rawAttrs.match(/style\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const styleRaw = (styleMatch ? styleMatch[2] || styleMatch[3] || styleMatch[4] || "" : "").toLowerCase();
    let wrapped = inner;
    if (/font-family\s*:[^;"']*(monospace|consolas|menlo|courier|monaco)/i.test(styleRaw)) wrapped = `<code>${wrapped}</code>`;
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(styleRaw)) wrapped = `<strong>${wrapped}</strong>`;
    if (/font-style\s*:\s*italic/i.test(styleRaw)) wrapped = `<em>${wrapped}</em>`;
    if (/text-decoration[^;]*underline/i.test(styleRaw)) wrapped = `<u>${wrapped}</u>`;
    if (/text-decoration[^;]*line-through/i.test(styleRaw)) wrapped = `<s>${wrapped}</s>`;
    return wrapped;
  });

  return out;
}

function normalizeHref(raw: string): string {
  const href = (raw || "").trim();
  if (!href) return "#";
  const lower = href.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:")) return href;
  if (href.startsWith("#") || href.startsWith("/")) return href;
  return "#";
}

export function sanitizePastedHtml(html: string, plainText: string, options?: SanitizeOptions): string {
  const preserveHeadings = options?.preserveHeadings ?? false;
  const allowTables = options?.allowTables ?? false;
  const allowTaskCheckbox = options?.allowTaskCheckbox ?? false;
  const disablePlainTextLineFallback = options?.disablePlainTextLineFallback ?? false;

  const source = (html || "").trim();
  if (!source) return plainTextToHtml(plainText);

  const allowedTags = [
    ...BASE_ALLOWED_TAGS,
    ...(allowTables ? ["table", "thead", "tbody", "tr", "th", "td"] : []),
    ...(allowTaskCheckbox ? ["input"] : [])
  ];

  const cleaned = sanitizeHtml(preprocessRichText(source, preserveHeadings), {
    allowedTags,
    allowedAttributes: {
      a: ["href"],
      input: ["type", "checked", "disabled"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    parser: { lowerCaseTags: true },
    transformTags: {
      b: "strong",
      i: "em",
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: {
          href: normalizeHref(attribs.href),
          target: "_blank",
          rel: "noopener noreferrer"
        }
      }),
      input: (tagName: string, attribs: Record<string, string>) => {
        if (!allowTaskCheckbox) return { tagName: "span", attribs: {}, text: "" };
        const type = (attribs.type || "").toLowerCase();
        if (type !== "checkbox") return { tagName: "span", attribs: {}, text: "" };
        return {
          tagName,
          attribs: {
            type: "checkbox",
            disabled: "",
            ...(attribs.checked !== undefined ? { checked: "" } : {})
          }
        };
      }
    }
  })
    .replace(/<(p|li|blockquote|h1|h2|h3|h4|h5|h6)>\s*<\/\1>/gi, "")
    .replace(/<p>\s*(<br>\s*)+<\/p>/gi, "<p><br></p>")
    .replace(/<\/p>\s*<p>/gi, "</p><p>")
    .trim();

  if (!cleaned || !/[A-Za-z0-9\u4e00-\u9fa5]/.test(cleaned)) {
    return plainTextToHtml(plainText);
  }

  const plainLines = countMeaningfulLines(plainText);
  const sanitizedBoundaries = countSanitizedBlockBoundaries(cleaned);
  if (!disablePlainTextLineFallback && plainLines >= 2 && sanitizedBoundaries < plainLines) {
    return plainTextToHtml(plainText);
  }

  return cleaned;
}

export function isLikelyMarkdown(plainText: string): boolean {
  const normalized = (plainText || "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return false;
  return MARKDOWN_FEATURE_RE.test(normalized);
}

export function markdownToSanitizedHtml(markdown: string): string {
  const normalized = (markdown || "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return "<p><br></p>";
  const rawHtml = String(marked.parse(normalized, { gfm: true, breaks: true }));
  return sanitizePastedHtml(rawHtml, normalized, {
    preserveHeadings: true,
    allowTables: true,
    allowTaskCheckbox: true,
    disablePlainTextLineFallback: true
  });
}

export function sanitizeLightNoteHtml(input: string): string {
  const source = (input || "").trim();
  if (!source) return "";

  return sanitizeHtml(source, {
    allowedTags: [...LIGHT_NOTE_ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href"],
      input: ["type", "checked", "disabled"],
      div: ["class", "data-task-id", "contenteditable"],
      span: ["class", "data-task-id", "contenteditable"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    parser: { lowerCaseTags: true },
    transformTags: {
      b: "strong",
      i: "em",
      a: (tagName: string, attribs: Attribs) => ({
        tagName,
        attribs: {
          href: normalizeHref(attribs.href),
          target: "_blank",
          rel: "noopener noreferrer"
        }
      }),
      input: (tagName: string, attribs: Attribs) => {
        const type = (attribs.type || "").toLowerCase();
        if (type !== "checkbox") return { tagName: "span", attribs: {}, text: "" };
        return {
          tagName,
          attribs: {
            type: "checkbox",
            disabled: "",
            ...(attribs.checked !== undefined ? { checked: "" } : {})
          }
        };
      },
      div: (tagName: string, attribs: Attribs) => {
        const next: Record<string, string> = {};
        if (attribs.class && /^ln-[a-z0-9-\s]+$/i.test(attribs.class)) next.class = attribs.class;
        if (attribs["data-task-id"] && /^[a-zA-Z0-9_-]+$/.test(attribs["data-task-id"])) next["data-task-id"] = attribs["data-task-id"];
        if (next.class?.split(/\s+/).includes("ln-task-card") && String(attribs.contenteditable).toLowerCase() === "false") {
          next.contenteditable = "false";
        }
        return { tagName, attribs: next };
      },
      span: (tagName: string, attribs: Attribs) => {
        const next: Record<string, string> = {};
        if (attribs.class && /^ln-[a-z0-9-\s]+$/i.test(attribs.class)) next.class = attribs.class;
        if (attribs["data-task-id"] && /^[a-zA-Z0-9_-]+$/.test(attribs["data-task-id"])) next["data-task-id"] = attribs["data-task-id"];
        if (next.class?.split(/\s+/).includes("ln-task-card") && String(attribs.contenteditable).toLowerCase() === "false") {
          next.contenteditable = "false";
        }
        return { tagName, attribs: next };
      }
    }
  }).trim();
}

export function resolveInitialLightNoteHtml(currentHtml: string, legacyMarkdown: string | null | undefined): string {
  const current = (currentHtml || "").trim();
  if (current) return sanitizeLightNoteHtml(current);

  const legacy = (legacyMarkdown || "").trim();
  if (legacy) return sanitizeLightNoteHtml(markdownToSanitizedHtml(legacy));

  return "";
}

export function hasLightNoteContent(html: string): boolean {
  const source = html || "";
  if (!source.trim()) return false;
  if (/\bln-task-card\b/i.test(source)) return true;
  const textOnly = source
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return textOnly.length > 0;
}

export function sanitizeNoteEditorHtml(input: string): string {
  return sanitizePastedHtml(input, "", {
    preserveHeadings: true,
    allowTables: true,
    allowTaskCheckbox: true,
    disablePlainTextLineFallback: true
  });
}
