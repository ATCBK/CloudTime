interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text: string): string {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return output;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = (): void => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim() === "") {
      closeList();
      html.push("<p></p>");
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${renderInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeList();
      html.push(`<h1>${renderInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("- [ ] ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li><input type="checkbox" disabled /> ${renderInline(line.slice(6))}</li>`);
      continue;
    }
    if (line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li><input type="checkbox" checked disabled /> ${renderInline(line.slice(6))}</li>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps): JSX.Element {
  return <article className={className} dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }} />;
}
