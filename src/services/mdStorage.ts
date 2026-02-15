import { NoteDocument } from "../types";

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
