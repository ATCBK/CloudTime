const BASE_ALLOWED_TAGS = new Set([
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
]);

interface NotesPasteSanitizeOptions {
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

function normalizeHref(raw: string): string {
  const href = (raw || "").trim();
  if (!href) return "#";
  const lower = href.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:")) return href;
  if (href.startsWith("#") || href.startsWith("/")) return href;
  return "#";
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

export function sanitizeClipboardHtmlForNotes(html: string, plainText: string, options?: NotesPasteSanitizeOptions): string {
  const preserveHeadings = options?.preserveHeadings ?? false;
  const allowTables = options?.allowTables ?? false;
  const allowTaskCheckbox = options?.allowTaskCheckbox ?? false;
  const disablePlainTextLineFallback = options?.disablePlainTextLineFallback ?? false;
  const allowedTags = new Set(BASE_ALLOWED_TAGS);
  if (allowTables) {
    ["table", "thead", "tbody", "tr", "th", "td"].forEach((tag) => allowedTags.add(tag));
  }
  if (allowTaskCheckbox) {
    allowedTags.add("input");
  }

  const source = (html || "").trim();
  if (!source) return plainTextToHtml(plainText);

  let out = source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|meta|link|xml)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|meta|link|xml)[^>]*\/?\s*>/gi, "")
    .replace(/<\s*o:p[^>]*>[\s\S]*?<\s*\/\s*o:p\s*>/gi, "")
    .replace(/\u200b/g, "")
    .replace(/&nbsp;/gi, " ");

  // Normalize common rich-text wrappers to semantic blocks to avoid content collapsing.
  out = out
    .replace(/<\s*\/?\s*(html|body|font)[^>]*>/gi, "")
    .replace(/<\s*(div|section|article|header|footer|main|aside)[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*(div|section|article|header|footer|main|aside)\s*>/gi, "</p>");
  if (!preserveHeadings) {
    out = out
      .replace(/<\s*h[1-6][^>]*>/gi, "<p>")
      .replace(/<\s*\/\s*h[1-6]\s*>/gi, "</p>");
  }

  // Preserve key inline semantics from styled spans before dropping style attributes.
  out = out.replace(/<span([^>]*)>([\s\S]*?)<\/span>/gi, (_full, rawAttrs: string, inner: string) => {
    const styleMatch = rawAttrs.match(/style\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const styleRaw = (styleMatch ? styleMatch[2] || styleMatch[3] || styleMatch[4] || "" : "").toLowerCase();
    let wrapped = inner;

    const hasMono = /font-family\s*:[^;"']*(monospace|consolas|menlo|courier|monaco)/i.test(styleRaw);
    const hasBold = /font-weight\s*:\s*(bold|[6-9]00)/i.test(styleRaw);
    const hasItalic = /font-style\s*:\s*italic/i.test(styleRaw);
    const hasUnderline = /text-decoration[^;]*underline/i.test(styleRaw);
    const hasStrike = /text-decoration[^;]*line-through/i.test(styleRaw);

    if (hasMono) wrapped = `<code>${wrapped}</code>`;
    if (hasBold) wrapped = `<strong>${wrapped}</strong>`;
    if (hasItalic) wrapped = `<em>${wrapped}</em>`;
    if (hasUnderline) wrapped = `<u>${wrapped}</u>`;
    if (hasStrike) wrapped = `<s>${wrapped}</s>`;
    return wrapped;
  });

  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const isClosing = full.startsWith("</");
    const tag = rawTag.toLowerCase();
    if (!allowedTags.has(tag)) return "";
    if (isClosing) {
      if (tag === "b") return "</strong>";
      if (tag === "i") return "</em>";
      if (tag === "input") return "";
      return `</${tag}>`;
    }

    if (tag === "b") return "<strong>";
    if (tag === "i") return "<em>";
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const hrefMatch = rawAttrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const hrefRaw = hrefMatch ? hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || "" : "";
      const href = normalizeHref(hrefRaw).replaceAll('"', "&quot;");
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }
    if (tag === "input") {
      if (!allowTaskCheckbox) return "";
      const typeMatch = rawAttrs.match(/type\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const typeRaw = (typeMatch ? typeMatch[2] || typeMatch[3] || typeMatch[4] || "" : "").toLowerCase();
      if (typeRaw !== "checkbox") return "";
      const checked = /\schecked(\s*=|\s|>|$)/i.test(rawAttrs) ? " checked" : "";
      return `<input type="checkbox" disabled${checked}>`;
    }
    return `<${tag}>`;
  });

  out = out
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<(p|li|blockquote|h1|h2|h3|h4|h5|h6)>\s*<\/\1>/gi, "")
    .replace(/<p>\s*(<br>\s*)+<\/p>/gi, "<p><br></p>")
    .replace(/<\/p>\s*<p>/gi, "</p><p>")
    .trim();

  if (!out || !/[A-Za-z0-9\u4e00-\u9fa5]/.test(out)) {
    return plainTextToHtml(plainText);
  }

  // If clipboard HTML lost line/block structure, prefer stable plain-text paragraph fallback.
  const plainLines = countMeaningfulLines(plainText);
  const sanitizedBoundaries = countSanitizedBlockBoundaries(out);
  if (!disablePlainTextLineFallback && plainLines >= 2 && sanitizedBoundaries < plainLines) {
    return plainTextToHtml(plainText);
  }

  return out;
}
