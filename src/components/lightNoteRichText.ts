const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "ul", "ol", "li", "a", "code", "div", "span"]);

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
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

export function markdownToBasicHtml(markdown: string): string {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = (): void => {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(trimmed.slice(2))}</li>`);
      continue;
    }

    closeList();
    if (trimmed.startsWith("# ")) {
      html.push(`<p><strong>${renderInline(trimmed.slice(2))}</strong></p>`);
      continue;
    }

    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n") || "<p>开始记录今天的重要事项...</p>";
}

export function sanitizeLightNoteHtml(input: string): string {
  const source = input || "";
  let html = source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");

  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const isClosing = full.startsWith("</");
    const tag = rawTag.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) return "";
    if (isClosing) return `</${tag}>`;
    if (tag === "br") return "<br>";

    if (tag === "a") {
      const hrefMatch = rawAttrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const hrefRaw = hrefMatch ? hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || "" : "";
      const href = normalizeHref(hrefRaw).replaceAll('"', "&quot;");
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }

    const classMatch = rawAttrs.match(/class\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const classRaw = classMatch ? classMatch[2] || classMatch[3] || classMatch[4] || "" : "";
    const classSafe = classRaw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => /^ln-[a-z0-9-]+$/i.test(item))
      .join(" ");

    const taskIdMatch = rawAttrs.match(/data-task-id\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const taskIdRaw = taskIdMatch ? taskIdMatch[2] || taskIdMatch[3] || taskIdMatch[4] || "" : "";
    const taskIdSafe = taskIdRaw.replace(/[^a-zA-Z0-9_-]/g, "");

    const attrs: string[] = [];
    const classNames = classSafe ? classSafe.split(/\s+/) : [];
    const isTaskCard = classNames.includes("ln-task-card");
    if (classSafe) attrs.push(`class="${classSafe.replaceAll('"', "&quot;")}"`);
    if (taskIdSafe) attrs.push(`data-task-id="${taskIdSafe}"`);
    const contentEditableMatch = rawAttrs.match(/contenteditable\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const contentEditableRaw = contentEditableMatch ? contentEditableMatch[2] || contentEditableMatch[3] || contentEditableMatch[4] || "" : "";
    if (tag === "div" && isTaskCard && contentEditableRaw.toLowerCase() === "false") {
      attrs.push('contenteditable="false"');
    }

    if (attrs.length > 0) return `<${tag} ${attrs.join(" ")}>`;
    return `<${tag}>`;
  });

  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return html.trim() || "<p>开始记录今天的重要事项...</p>";
}

export function resolveInitialLightNoteHtml(currentHtml: string, legacyMarkdown: string | null | undefined): string {
  const current = (currentHtml || "").trim();
  if (current) return sanitizeLightNoteHtml(current);

  const legacy = (legacyMarkdown || "").trim();
  if (legacy) return sanitizeLightNoteHtml(markdownToBasicHtml(legacy));

  return "<p>开始记录今天的重要事项...</p>";
}
