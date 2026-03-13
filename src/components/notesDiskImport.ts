export interface FolderNode {
  id: string;
  name: string;
  children: FolderNode[];
}

export interface RichNote {
  id: string;
  folderId: string;
  title: string;
  contentHtml: string;
  updatedAt: number;
}

export interface DiskMdEntry {
  relativeDir: string;
  fileName: string;
  content: string;
  updatedAt: number;
}

export interface NotesImportModel {
  folders: FolderNode[];
  notes: RichNote[];
  selectedFolderId: string;
  currentNoteId: string;
  expandedFolderIds: string[];
}

interface MutableFolderNode {
  id: string;
  name: string;
  children: MutableFolderNode[];
}

const ROOT_FOLDER_ID = "folder_local-import";
const ROOT_FOLDER_NAME = "本地笔记";

function slug(input: string): string {
  const cleaned = (input || "").trim().toLowerCase().replace(/[^\w\u4e00-\u9fff-]+/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "node";
}

function toId(prefix: string, raw: string): string {
  return `${prefix}_${slug(raw)}`;
}

function finalizeFolderTree(nodes: MutableFolderNode[]): FolderNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    children: finalizeFolderTree(node.children)
  }));
}

function folderPathToId(parts: string[]): string {
  if (parts.length === 0 || parts[0] === ROOT_FOLDER_NAME) {
    if (parts.length <= 1) return ROOT_FOLDER_ID;
    return `${ROOT_FOLDER_ID}_${slug(parts.slice(1).join("/"))}`;
  }
  return toId("folder", parts.join("/"));
}

function ensureFolder(root: MutableFolderNode[], parts: string[]): void {
  if (parts.length === 0) return;
  const [head, ...rest] = parts;
  const id = folderPathToId(parts.slice(0, 1));
  let node = root.find((item) => item.name === head);
  if (!node) {
    node = { id, name: head, children: [] };
    root.push(node);
  }
  if (rest.length === 0) return;

  let cursor = node;
  for (let i = 1; i < parts.length; i += 1) {
    const currentParts = parts.slice(0, i + 1);
    const currentName = parts[i];
    const currentId = folderPathToId(currentParts);
    let child = cursor.children.find((item) => item.name === currentName);
    if (!child) {
      child = { id: currentId, name: currentName, children: [] };
      cursor.children.push(child);
    }
    cursor = child;
  }
}

export function buildNotesImportModel(
  entries: DiskMdEntry[],
  markdownToHtml: (markdown: string) => string
): NotesImportModel {
  const mutableRoot: MutableFolderNode[] = [{ id: ROOT_FOLDER_ID, name: ROOT_FOLDER_NAME, children: [] }];
  const notes: RichNote[] = [];
  const expanded = new Set<string>([ROOT_FOLDER_ID]);

  const sorted = [...entries].sort((a, b) => {
    const aKey = `${a.relativeDir}/${a.fileName}`.toLowerCase();
    const bKey = `${b.relativeDir}/${b.fileName}`.toLowerCase();
    return aKey.localeCompare(bKey);
  });

  for (const entry of sorted) {
    const parts = (entry.relativeDir || "")
      .split(/[\\/]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const fullFolderParts = [ROOT_FOLDER_NAME, ...parts];
    ensureFolder(mutableRoot, fullFolderParts);
    for (let i = 1; i <= fullFolderParts.length; i += 1) {
      expanded.add(folderPathToId(fullFolderParts.slice(0, i)));
    }

    const folderId = folderPathToId(fullFolderParts);
    const noteId = toId("note", `${entry.relativeDir}/${entry.fileName}`);
    notes.push({
      id: noteId,
      folderId,
      title: entry.fileName,
      contentHtml: markdownToHtml(entry.content || ""),
      updatedAt: entry.updatedAt || Date.now()
    });
  }

  const folderTree = finalizeFolderTree(mutableRoot);
  const currentNoteId = notes[0]?.id ?? "";

  return {
    folders: folderTree,
    notes,
    selectedFolderId: ROOT_FOLDER_ID,
    currentNoteId,
    expandedFolderIds: [...expanded]
  };
}
