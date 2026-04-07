import { NoteDocument } from "../types";

export interface DiskNoteSaveEntry {
  relativeDir: string;
  fileName: string;
  content: string;
  updatedAt: number;
}

export interface MdSavePayload {
  project: string;
  date: string;
  title: string;
  linkedTaskIds: string[];
  content: string;
}

export function toMarkdown(payload: MdSavePayload): string {
  const frontmatter = [
    "---",
    `date: ${payload.date}`,
    `project: ${payload.project}`,
    `linked_tasks: [${payload.linkedTaskIds.join(", ")}]`,
    "---",
    ""
  ].join("\n");
  return `${frontmatter}\n${payload.content}\n`;
}

export function toFileName(note: Pick<NoteDocument, "date" | "title">): string {
  const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, "_").trim() || "untitled";
  return `${note.date}-${safeTitle}.md`;
}

function decodeHtml(input: string): string {
  if (typeof window === "undefined") return input;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = input;
  return textarea.value;
}

function collapseBlankLines(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToMarkdownWithoutDom(html: string): string {
  return collapseBlankLines(
    (html || "")
      .replace(/\r\n/g, "\n")
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_full, level: string, text: string) => `\n${"#".repeat(Number(level))} ${decodeHtml(text.replace(/<[^>]+>/g, " ").trim())}\n`)
      .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_full, _tag, text: string) => `**${decodeHtml(text.replace(/<[^>]+>/g, ""))}**`)
      .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_full, _tag, text: string) => `*${decodeHtml(text.replace(/<[^>]+>/g, ""))}*`)
      .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_full, href: string, text: string) => `[${decodeHtml(text.replace(/<[^>]+>/g, "").trim())}](${href})`)
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_full, text: string) => `\n- ${decodeHtml(text.replace(/<[^>]+>/g, " ").trim())}`)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
  );
}

function textFromNode(node: Node): string {
  return decodeHtml(node.textContent || "").replace(/\u00a0/g, " ");
}

function nodeToMarkdown(node: Node, depth: number = 0): string {
  if (node.nodeType === Node.TEXT_NODE) return textFromNode(node);
  if (!(node instanceof HTMLElement)) return "";

  const childMarkdown = Array.from(node.childNodes).map((child) => nodeToMarkdown(child, depth)).join("");
  const text = textFromNode(node);
  const lines = childMarkdown
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));

  switch (node.tagName.toLowerCase()) {
    case "br":
      return "\n";
    case "strong":
    case "b":
      return `**${childMarkdown || text}**`;
    case "em":
    case "i":
      return `*${childMarkdown || text}*`;
    case "u":
      return `<u>${childMarkdown || text}</u>`;
    case "s":
      return `~~${childMarkdown || text}~~`;
    case "code":
      if (node.parentElement?.tagName.toLowerCase() === "pre") return childMarkdown || text;
      return `\`${(childMarkdown || text).replace(/\n+/g, " ")}\``;
    case "pre":
      return `\n\`\`\`\n${text.replace(/\n$/, "")}\n\`\`\`\n`;
    case "a": {
      const href = node.getAttribute("href") || "#";
      const label = collapseBlankLines(childMarkdown || text) || href;
      return `[${label}](${href})`;
    }
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Number(node.tagName[1]);
      return `\n${"#".repeat(level)} ${collapseBlankLines(childMarkdown || text)}\n`;
    }
    case "blockquote": {
      const content = collapseBlankLines(childMarkdown || text);
      return `\n${content.split("\n").map((line) => `> ${line}`).join("\n")}\n`;
    }
    case "li": {
      const checkbox = node.querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null;
      const raw = Array.from(node.childNodes)
        .filter((child) => !(child instanceof HTMLElement && child.tagName.toLowerCase() === "input"))
        .map((child) => nodeToMarkdown(child, depth + 1))
        .join("");
      const content = collapseBlankLines(raw || text);
      const indent = "  ".repeat(depth);
      if (checkbox) return `${indent}- [${checkbox.checked ? "x" : " "}] ${content}`;
      const parentTag = node.parentElement?.tagName.toLowerCase();
      if (parentTag === "ol") {
        const index = Array.from(node.parentElement?.children || []).indexOf(node) + 1;
        return `${indent}${index}. ${content}`;
      }
      return `${indent}- ${content}`;
    }
    case "ul":
    case "ol":
      return `\n${Array.from(node.children).map((child) => nodeToMarkdown(child, depth)).join("\n")}\n`;
    case "p":
      return `\n${collapseBlankLines(childMarkdown || text || "<br>")}\n`;
    case "div":
    case "section":
    case "article":
      return `\n${childMarkdown}\n`;
    default:
      return childMarkdown || text;
  }
}

export function htmlToMarkdown(html: string): string {
  if (typeof window === "undefined") {
    return htmlToMarkdownWithoutDom(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "<p><br></p>", "text/html");
  const markdown = Array.from(doc.body.childNodes).map((node) => nodeToMarkdown(node)).join("");
  return collapseBlankLines(markdown) || "";
}

function sanitizePathSegment(segment: string, fallback: string): string {
  const cleaned = (segment || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function uniquePath(relativeDir: string, fileName: string, used: Set<string>): { relativeDir: string; fileName: string } {
  const extMatch = fileName.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] || "";
  const stem = ext ? fileName.slice(0, -ext.length) : fileName;
  const makeKey = (name: string) => `${relativeDir}/${name}`.replace(/^\/+/, "").toLowerCase();

  if (!used.has(makeKey(fileName))) {
    used.add(makeKey(fileName));
    return { relativeDir, fileName };
  }

  let i = 2;
  let nextFileName = `${stem} (${i})${ext}`;
  while (used.has(makeKey(nextFileName))) {
    i += 1;
    nextFileName = `${stem} (${i})${ext}`;
  }
  used.add(makeKey(nextFileName));
  return { relativeDir, fileName: nextFileName };
}

export function buildDiskNoteEntries(
  notes: Array<{ title: string; contentHtml: string; folderPath: string[]; updatedAt?: number }>
): DiskNoteSaveEntry[] {
  const used = new Set<string>();
  return notes.map((note) => {
    const safeParts = note.folderPath.map((part, index) => sanitizePathSegment(part, `folder-${index + 1}`));
    const baseName = sanitizePathSegment(note.title, "untitled.md").replace(/\.md$/i, "");
    const fileName = `${baseName || "untitled"}.md`;
    const relativeDir = safeParts.join("/");
    const unique = uniquePath(relativeDir, fileName, used);
    const markdown = htmlToMarkdown(note.contentHtml);
    const updatedDate = new Date(note.updatedAt || Date.now()).toISOString().slice(0, 10);
    return {
      relativeDir: unique.relativeDir,
      fileName: unique.fileName,
      updatedAt: note.updatedAt || Date.now(),
      content: toMarkdown({
        project: safeParts[0] || "默认项目",
        date: updatedDate,
        title: unique.fileName.replace(/\.md$/i, ""),
        linkedTaskIds: [],
        content: markdown || "_空白笔记_"
      })
    };
  });
}
