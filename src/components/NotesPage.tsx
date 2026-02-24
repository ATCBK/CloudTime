import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code,
  Eye,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  RemoveFormatting,
  Underline,
  Pencil,
  RefreshCw,
  Redo2,
  Scissors,
  Trash2,
  Undo2,
  Upload
} from "lucide-react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { NoteDocument } from "../types";

interface NotesPageProps {
  notes: NoteDocument[];
  baseDir?: string;
}

interface FolderNode {
  id: string;
  name: string;
  children: FolderNode[];
}

interface RichNote {
  id: string;
  folderId: string;
  title: string;
  contentHtml: string;
  updatedAt: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  folderId: string;
  noteId?: string;
  targetType: "folder" | "note";
}

interface FolderClipboard {
  mode: "cut" | "copy";
  node: FolderNode;
}

interface SelectionMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface SelectionContextState {
  visible: boolean;
  x: number;
  y: number;
}

interface PopupPosition {
  x: number;
  y: number;
}

interface EditorFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  ordered: boolean;
  unordered: boolean;
  align: "left" | "center" | "right";
  block: BlockFormatKey;
}

interface NoteComment {
  id: string;
  text: string;
  createdAt: number;
  quote?: string;
}

interface TocHeadingNode {
  id: string;
  text: string;
  level: number;
  index: number;
  children: TocHeadingNode[];
}

type BlockFormatKey =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "ordered"
  | "unordered"
  | "task"
  | "codeblock";

const DEFAULT_TOOLBAR_ORDER = [
  "undo",
  "redo",
  "blockMenu",
  "ordered",
  "link",
  "code",
  "alignLeft",
  "alignCenter",
  "alignRight",
  "clear",
  "bold",
  "italic",
  "delete"
] as const;
const CAPSULE_IDLE_MS = 1000;
const CAPSULE_MIN_SIZE = 44;
const CAPSULE_TRACK_PADDING = 6;

function normalizeToolbarOrder(order: string[]): string[] {
  const allowed = new Set<string>(DEFAULT_TOOLBAR_ORDER);
  const deduped: string[] = [];
  for (const id of order) {
    if (allowed.has(id) && !deduped.includes(id)) deduped.push(id);
  }
  for (const id of DEFAULT_TOOLBAR_ORDER) {
    if (!deduped.includes(id)) deduped.push(id);
  }
  return deduped;
}

function genId(prefix: string): string {
  if ("randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureMdFileName(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ");
  const trimmed = cleaned.trim();
  if (!trimmed) return "未命名.md";
  return trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeUnsupportedHtml(input: string): string {
  if (!input || typeof window === "undefined") return input;
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  doc.querySelectorAll("input,img").forEach((node) => node.remove());
  return doc.body.innerHTML;
}

function removeCommentAnchorFromHtml(input: string, commentId: string): string {
  if (!input || typeof window === "undefined") return input;
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const anchors = Array.from(doc.querySelectorAll(".inline-comment-highlight"));
  for (const node of anchors) {
    const el = node as HTMLElement;
    if (el.dataset.commentId !== commentId) continue;
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }
  return doc.body.innerHTML;
}

function createInitialFolders(notes: NoteDocument[]): FolderNode[] {
  const projects = [...new Set(notes.map((n) => n.project))];
  const names = projects.length > 0 ? projects : ["默认项目"];
  return names.map((name) => ({ id: genId("folder"), name, children: [] }));
}

function createInitialNotes(notes: NoteDocument[], folders: FolderNode[]): RichNote[] {
  if (folders.length === 0) return [];
  if (notes.length === 0) {
    return [{ id: genId("note"), folderId: folders[0].id, title: "未命名.md", contentHtml: "<p></p>", updatedAt: Date.now() }];
  }

  return notes.map((note, i) => ({
    id: genId("note"),
    folderId: folders[i % folders.length].id,
    title: ensureMdFileName(note.title || "未命名"),
    contentHtml: `<p>${note.content}</p>`,
    updatedAt: Date.now()
  }));
}

function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findFolder(node.children, id);
    if (child) return child;
  }
  return null;
}

function findFolderPathNames(nodes: FolderNode[], id: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    if (node.id === id) return nextPath;
    const childPath = findFolderPathNames(node.children, id, nextPath);
    if (childPath) return childPath;
  }
  return null;
}

function flattenFolderIds(nodes: FolderNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenFolderIds(node.children)]);
}

function collectFolderIds(node: FolderNode): string[] {
  return [node.id, ...node.children.flatMap(collectFolderIds)];
}

function removeNode(nodes: FolderNode[], targetId: string): { next: FolderNode[]; removedNode: FolderNode | null } {
  let removedNode: FolderNode | null = null;

  const next = nodes
    .filter((node) => {
      if (node.id !== targetId) return true;
      removedNode = node;
      return false;
    })
    .map((node) => {
      if (removedNode) return node;
      const childResult = removeNode(node.children, targetId);
      if (childResult.removedNode) {
        removedNode = childResult.removedNode;
      }
      return { ...node, children: childResult.next };
    });

  return { next, removedNode };
}

function insertChild(nodes: FolderNode[], parentId: string, child: FolderNode): FolderNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) return { ...node, children: [...node.children, child] };
    return { ...node, children: insertChild(node.children, parentId, child) };
  });
}

function renameFolderTree(nodes: FolderNode[], folderId: string, name: string): FolderNode[] {
  return nodes.map((node) => {
    if (node.id === folderId) return { ...node, name };
    return { ...node, children: renameFolderTree(node.children, folderId, name) };
  });
}

function containsFolder(root: FolderNode, targetId: string): boolean {
  if (root.id === targetId) return true;
  return root.children.some((child) => containsFolder(child, targetId));
}

function cloneFolderWithMap(node: FolderNode, map: Map<string, string>): FolderNode {
  const id = genId("folder");
  map.set(node.id, id);
  return {
    id,
    name: `${node.name}-副本`,
    children: node.children.map((child) => cloneFolderWithMap(child, map))
  };
}

function nextName(base: string, exists: string[]): string {
  if (!exists.includes(base)) return base;
  let i = 2;
  while (exists.includes(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

function nextFileName(base: string, exists: string[]): string {
  const normalized = exists.map((name) => name.toLowerCase());
  const first = ensureMdFileName(base);
  if (!normalized.includes(first.toLowerCase())) return first;
  let i = 2;
  while (normalized.includes(ensureMdFileName(`${base} ${i}`).toLowerCase())) i += 1;
  return ensureMdFileName(`${base} ${i}`);
}

function parseTocHeadings(html: string): TocHeadingNode[] {
  if (!html || typeof window === "undefined") return [];
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4"));
  if (headings.length === 0) return [];

  const roots: TocHeadingNode[] = [];
  const stack: TocHeadingNode[] = [];

  headings.forEach((heading, index) => {
    const level = Number(heading.tagName.slice(1));
    const text = (heading.textContent || "").trim() || `未命名标题 ${index + 1}`;
    const node: TocHeadingNode = {
      id: `toc-${index}`,
      text,
      level,
      index,
      children: []
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  return roots;
}

export function NotesPage({ notes, baseDir }: NotesPageProps): JSX.Element {
  const initialFolders = useMemo(() => createInitialFolders(notes), [notes]);
  const [folders, setFolders] = useLocalStorageState<FolderNode[]>("cloudo.notes.tree", initialFolders);
  const [expandedIds, setExpandedIds] = useLocalStorageState<string[]>("cloudo.notes.expanded", []);
  const [selectedFolderId, setSelectedFolderId] = useLocalStorageState<string>("cloudo.notes.selectedFolder", initialFolders[0]?.id ?? "");
  const [leftPaneWidth, setLeftPaneWidth] = useLocalStorageState<number>("cloudo.notes.leftPaneWidth", 280);
  const [commentPaneWidth, setCommentPaneWidth] = useLocalStorageState<number>("cloudo.notes.commentPaneWidth", 280);
  const [treePanelCollapsed, setTreePanelCollapsed] = useLocalStorageState<boolean>("cloudo.notes.treePanelCollapsed", false);
  const [tocPanelCollapsed, setTocPanelCollapsed] = useLocalStorageState<boolean>("cloudo.notes.tocPanelCollapsed", false);
  const [commentPanelCollapsed, setCommentPanelCollapsed] = useLocalStorageState<boolean>("cloudo.notes.commentPanelCollapsed", false);
  const [focusMode, setFocusMode] = useLocalStorageState<boolean>("cloudo.notes.focusMode", false);

  const initialRichNotes = useMemo(() => createInitialNotes(notes, initialFolders), [notes, initialFolders]);
  const [noteList, setNoteList] = useLocalStorageState<RichNote[]>("cloudo.notes.richList", initialRichNotes);
  const [currentNoteId, setCurrentNoteId] = useLocalStorageState<string>("cloudo.notes.currentNote", initialRichNotes[0]?.id ?? "");
  const [editorMode, setEditorMode] = useLocalStorageState<"edit" | "preview">("cloudo.notes.editorMode", "edit");
  const [tocPaneWidth, setTocPaneWidth] = useLocalStorageState<number>("cloudo.notes.tocPaneWidth", 260);
  const [tocCollapsedIds, setTocCollapsedIds] = useLocalStorageState<string[]>("cloudo.notes.tocCollapsedIds", []);

  const [saveText, setSaveText] = useState<string>("已保存");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [clipboard, setClipboard] = useState<FolderClipboard | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string>("");
  const [renamingDraft, setRenamingDraft] = useState<string>("");
  const [renamingFolderId, setRenamingFolderId] = useState<string>("");
  const [renamingFolderDraft, setRenamingFolderDraft] = useState<string>("");
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>({ visible: false, x: 0, y: 0 });
  const [selectionContext, setSelectionContext] = useState<SelectionContextState>({ visible: false, x: 0, y: 0 });
  const [blockMenuOpen, setBlockMenuOpen] = useState<boolean>(false);
  const [blockMenuPos, setBlockMenuPos] = useState<PopupPosition>({ x: 0, y: 0 });
  const [blockMenuCompact, setBlockMenuCompact] = useState<boolean>(false);
  const [toolbarOrder, setToolbarOrder] = useLocalStorageState<string[]>("cloudo.notes.toolbarOrder", [...DEFAULT_TOOLBAR_ORDER]);
  const [dragToolbarId, setDragToolbarId] = useState<string>("");
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [flashHeadingIndex, setFlashHeadingIndex] = useState<number | null>(null);
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [formatState, setFormatState] = useState<EditorFormatState>({
    bold: false,
    italic: false,
    underline: false,
    ordered: false,
    unordered: false,
    align: "left",
    block: "paragraph"
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const editorMainRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const tocResizingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const commentResizingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const editorBodyRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const focusSnapshotRef = useRef<{ tree: boolean; toc: boolean; comment: boolean } | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const tocTreeRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const pendingCommentSelectionRef = useRef<{ range: Range; quote: string } | null>(null);
  const pendingSaveRef = useRef<{ noteId: string; html: string } | null>(null);
  const capsuleTimersRef = useRef<Map<HTMLElement, number>>(new Map());
  const capsuleRafRef = useRef<Map<HTMLElement, number>>(new Map());
  const capsulePulseRef = useRef<Map<HTMLElement, number>>(new Map());
  const capsuleMetricsRef = useRef<Map<HTMLElement, { scrollRange: number; maxTop: number; thumbHeight: number }>>(new Map());
  const tocOffsetsRef = useRef<number[]>([]);
  const tocSyncRafRef = useRef<number | null>(null);
  const tocSyncTimerRef = useRef<number | null>(null);

  const [commentsByNote, setCommentsByNote] = useLocalStorageState<Record<string, NoteComment[]>>("cloudo.notes.commentsByNote", {});

  const folderIdSet = useMemo(() => new Set(flattenFolderIds(folders)), [folders]);
  const selectedFolder = useMemo(() => findFolder(folders, selectedFolderId) ?? folders[0] ?? null, [folders, selectedFolderId]);
  const notesByFolder = useMemo(() => {
    const map = new Map<string, RichNote[]>();
    for (const note of noteList) {
      const list = map.get(note.folderId) || [];
      list.push(note);
      map.set(note.folderId, list);
    }
    return map;
  }, [noteList]);
  const currentNote = useMemo(() => noteList.find((n) => n.id === currentNoteId) ?? null, [noteList, currentNoteId]);
  const currentComments = useMemo(() => commentsByNote[currentNoteId] || [], [commentsByNote, currentNoteId]);
  const computedLeftPaneWidth = focusMode ? 0 : (treePanelCollapsed ? 34 : leftPaneWidth);
  const computedLeftDividerWidth = focusMode || treePanelCollapsed ? 0 : 6;
  const computedTocPaneWidth = focusMode ? 0 : (tocPanelCollapsed ? 34 : tocPaneWidth);
  const computedTocDividerWidth = focusMode || tocPanelCollapsed ? 0 : 6;
  const computedCommentPaneWidth = focusMode ? 0 : (commentPanelCollapsed ? 40 : commentPaneWidth);
  const computedCommentDividerWidth = focusMode ? 0 : 6;
  const sanitizedCurrentHtml = useMemo(() => sanitizeUnsupportedHtml(currentNote?.contentHtml ?? "<p></p>"), [currentNote?.contentHtml]);
  const tocTree = useMemo(() => parseTocHeadings(sanitizedCurrentHtml), [sanitizedCurrentHtml]);
  const tocFlat = useMemo(() => {
    const list: TocHeadingNode[] = [];
    const walk = (nodes: TocHeadingNode[]): void => {
      for (const node of nodes) {
        list.push(node);
        walk(node.children);
      }
    };
    walk(tocTree);
    return list;
  }, [tocTree]);
  const breadcrumb = useMemo(() => {
    if (!currentNote) return "未选择文件";
    const folderPath = findFolderPathNames(folders, currentNote.folderId) ?? [];
    return [...folderPath, currentNote.title].join(" > ");
  }, [currentNote, folders]);

  useEffect(() => {
    if (folders.length === 0) {
      const fallback = [{ id: genId("folder"), name: "默认项目", children: [] }];
      setFolders(fallback);
      setSelectedFolderId(fallback[0].id);
      return;
    }
    if (!folderIdSet.has(selectedFolderId)) setSelectedFolderId(folders[0].id);
  }, [folders, folderIdSet, selectedFolderId, setFolders, setSelectedFolderId]);

  useEffect(() => {
    if (!selectedFolder) return;
    const notesInSelected = noteList.filter((n) => n.folderId === selectedFolder.id);
    if (notesInSelected.length === 0) {
      if (currentNoteId) setCurrentNoteId("");
      return;
    }
    const stillExists = notesInSelected.some((n) => n.id === currentNoteId);
    if (!stillExists) setCurrentNoteId(notesInSelected[0].id);
  }, [noteList, selectedFolder, currentNoteId, setCurrentNoteId]);

  useEffect(() => {
    if (!currentNoteId) return;
    const current = noteList.find((item) => item.id === currentNoteId);
    if (!current) return;
    if (selectedFolderId !== current.folderId) setSelectedFolderId(current.folderId);
  }, [currentNoteId, noteList, selectedFolderId, setSelectedFolderId]);

  // Normalize legacy titles loaded from storage to avoid garbled/wrapped artifacts.
  useEffect(() => {
    setNoteList((prev) => {
      let changed = false;
      const next = prev.map((note) => {
        const normalizedTitle = ensureMdFileName(note.title);
        if (normalizedTitle !== note.title) {
          changed = true;
          return { ...note, title: normalizedTitle };
        }
        return note;
      });
      return changed ? next : prev;
    });
  }, [setNoteList]);

  useEffect(() => {
    if (!editorRef.current || !currentNote || editorMode !== "edit") return;
    if (editorRef.current.innerHTML !== sanitizedCurrentHtml) {
      editorRef.current.innerHTML = sanitizedCurrentHtml;
    }
  }, [currentNote, editorMode, sanitizedCurrentHtml]);

  useEffect(() => {
    if (!currentNote) return;
    if (sanitizedCurrentHtml === currentNote.contentHtml) return;
    setNoteList((prev) =>
      prev.map((note) => (note.id === currentNote.id ? { ...note, contentHtml: sanitizedCurrentHtml, updatedAt: Date.now() } : note))
    );
  }, [currentNote, sanitizedCurrentHtml, setNoteList]);

  useEffect(() => {
    const close = (): void => {
      setContextMenu(null);
      setSelectionContext((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setBlockMenuOpen(false);
      setMoreMenuOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      const current = resizingRef.current;
      if (current && workspaceRef.current) {
        const width = workspaceRef.current.clientWidth;
        const delta = event.clientX - current.startX;
        const maxLeft = Math.max(220, width - 360);
        const next = Math.max(220, Math.min(maxLeft, current.startWidth + delta));
        setLeftPaneWidth(next);
      }

      const tocCurrent = tocResizingRef.current;
      if (tocCurrent && editorBodyRef.current) {
        const width = editorBodyRef.current.clientWidth;
        const delta = event.clientX - tocCurrent.startX;
        const maxToc = Math.max(220, width - 420);
        const next = Math.max(180, Math.min(maxToc, tocCurrent.startWidth + delta));
        setTocPaneWidth(next);
      }

      const commentCurrent = commentResizingRef.current;
      if (commentCurrent && editorBodyRef.current) {
        const width = editorBodyRef.current.clientWidth;
        const delta = commentCurrent.startX - event.clientX;
        const maxComment = Math.max(220, width - 560);
        const next = Math.max(220, Math.min(maxComment, commentCurrent.startWidth + delta));
        setCommentPaneWidth(next);
      }
    };

    const onMouseUp = (): void => {
      if (!resizingRef.current && !tocResizingRef.current && !commentResizingRef.current) return;
      resizingRef.current = null;
      tocResizingRef.current = null;
      commentResizingRef.current = null;
      document.body.classList.remove("resizing-active");
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setLeftPaneWidth, setTocPaneWidth, setCommentPaneWidth]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        runCommand("bold");
      }
      if (key === "i") {
        event.preventDefault();
        runCommand("italic");
      }
      if (key === "z") {
        event.preventDefault();
        runCommand(event.shiftKey ? "redo" : "undo");
      }
      if (key === "y") {
        event.preventDefault();
        runCommand("redo");
      }
      if (key === "k") {
        event.preventDefault();
        insertLink();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const startResize = (event: React.MouseEvent): void => {
    resizingRef.current = { startX: event.clientX, startWidth: leftPaneWidth };
    document.body.classList.add("resizing-active");
  };

  const startTocResize = (event: React.MouseEvent): void => {
    tocResizingRef.current = { startX: event.clientX, startWidth: tocPaneWidth };
    document.body.classList.add("resizing-active");
  };

  const startCommentResize = (event: React.MouseEvent): void => {
    commentResizingRef.current = { startX: event.clientX, startWidth: commentPaneWidth };
    document.body.classList.add("resizing-active");
  };

  const toggleFocusMode = (): void => {
    if (!focusMode) {
      focusSnapshotRef.current = {
        tree: treePanelCollapsed,
        toc: tocPanelCollapsed,
        comment: commentPanelCollapsed
      };
      setTreePanelCollapsed(true);
      setTocPanelCollapsed(true);
      setCommentPanelCollapsed(true);
      setFocusMode(true);
      return;
    }

    setFocusMode(false);
    const snapshot = focusSnapshotRef.current;
    if (snapshot) {
      setTreePanelCollapsed(snapshot.tree);
      setTocPanelCollapsed(snapshot.toc);
      setCommentPanelCollapsed(snapshot.comment);
      focusSnapshotRef.current = null;
    } else {
      setTreePanelCollapsed(false);
      setTocPanelCollapsed(false);
      setCommentPanelCollapsed(false);
    }
  };

  const toggleTreePanel = (): void => {
    if (treePanelCollapsed) {
      setTreePanelCollapsed(false);
      window.requestAnimationFrame(() => treeContainerRef.current?.focus());
      return;
    }
    setTreePanelCollapsed(true);
  };

  const toggleTocPanel = (): void => {
    if (tocPanelCollapsed) {
      setTocPanelCollapsed(false);
      window.requestAnimationFrame(() => tocTreeRef.current?.focus());
      return;
    }
    setTocPanelCollapsed(true);
  };

  const toggleCommentPanel = (): void => {
    if (commentPanelCollapsed) {
      setCommentPanelCollapsed(false);
      window.requestAnimationFrame(() => commentInputRef.current?.focus());
      return;
    }
    setCommentPanelCollapsed(true);
  };

  const restoreSelection = (): boolean => {
    if (!editorRef.current) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    const range = savedRangeRef.current;
    if (!range) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const ensureFocus = (): void => editorRef.current?.focus({ preventScroll: true });

  const resolveBlockFromNode = (node: Node | null): BlockFormatKey => {
    if (!node || !editorRef.current) return "paragraph";
    const el = node instanceof Element ? node : node.parentElement;
    if (!el || !editorRef.current.contains(el)) return "paragraph";
    if (el.closest("h1")) return "h1";
    if (el.closest("h2")) return "h2";
    if (el.closest("h3")) return "h3";
    if (el.closest("h4,h5,h6")) return "h4";
    if (el.closest("ol")) return "ordered";
    if (el.closest("ul")) return "unordered";
    if (el.closest("pre")) return "codeblock";
    if (el.closest('input[type="checkbox"]')) return "task";
    return "paragraph";
  };

  const updateFormatState = (): void => {
    if (editorMode !== "edit" || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    const withinEditor =
      commonNode instanceof Node &&
      (editorRef.current.contains(commonNode) || commonNode === editorRef.current);
    if (!withinEditor) return;

    const bold = document.queryCommandState("bold");
    const italic = document.queryCommandState("italic");
    const underline = document.queryCommandState("underline");
    const ordered = document.queryCommandState("insertOrderedList");
    const unordered = document.queryCommandState("insertUnorderedList");
    const align: "left" | "center" | "right" = document.queryCommandState("justifyCenter")
      ? "center"
      : document.queryCommandState("justifyRight")
        ? "right"
        : "left";
    const block = resolveBlockFromNode(commonNode);
    setFormatState({ bold, italic, underline, ordered, unordered, align, block });
  };

  const withEditorSelection = (action: () => void): void => {
    if (editorMode !== "edit") return;
    ensureFocus();
    restoreSelection();
    action();
    if (editorRef.current) updateCurrentNote(editorRef.current.innerHTML);
    updateSelectionMenu();
    updateFormatState();
  };

  const flushPendingSave = useCallback((): void => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    setNoteList((prev) =>
      prev.map((n) => (n.id === pending.noteId ? { ...n, contentHtml: pending.html, updatedAt: Date.now() } : n))
    );
    pendingSaveRef.current = null;
    setSaveText("已保存");
  }, [setNoteList]);

  const updateCurrentNote = (html: string): void => {
    if (!currentNote) return;
    pendingSaveRef.current = { noteId: currentNote.id, html: sanitizeUnsupportedHtml(html) };
    setSaveText("编辑中，5秒自动保存");
  };

  const runCommand = (command: string, value?: string): void => {
    withEditorSelection(() => {
      document.execCommand(command, false, value);
    });
  };

  const insertLink = (): void => {
    const url = window.prompt("输入链接地址", "https://");
    if (!url) return;
    runCommand("createLink", url);
  };

  const insertCode = (): void => {
    withEditorSelection(() => {
      const text = window.getSelection()?.toString() || "code";
      document.execCommand("insertHTML", false, `<code>${text.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code>`);
    });
  };

  const openBlockMenuAt = (x: number, y: number, compact = false): void => {
    setBlockMenuPos({ x, y });
    setBlockMenuCompact(compact);
    setBlockMenuOpen(true);
  };

  const applyBlockFormat = (key: BlockFormatKey): void => {
    if (key === formatState.block && key !== "paragraph") {
      if (key === "ordered") runCommand("insertOrderedList");
      else if (key === "unordered") runCommand("insertUnorderedList");
      else runCommand("formatBlock", "<p>");
      setBlockMenuOpen(false);
      return;
    }
    if (key === "paragraph") runCommand("formatBlock", "<p>");
    if (key === "h1") runCommand("formatBlock", "<h1>");
    if (key === "h2") runCommand("formatBlock", "<h2>");
    if (key === "h3") runCommand("formatBlock", "<h3>");
    if (key === "h4") runCommand("formatBlock", "<h4>");
    if (key === "ordered") runCommand("insertOrderedList");
    if (key === "unordered") runCommand("insertUnorderedList");
    if (key === "task") {
      withEditorSelection(() => {
        const selected = window.getSelection()?.toString() || "";
        const safe = selected
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        const content = safe.trim().length > 0 ? safe : "&nbsp;";
        document.execCommand("insertHTML", false, `<p><input type="checkbox" /> ${content}</p>`);
      });
    }
    if (key === "codeblock") {
      withEditorSelection(() => {
        document.execCommand("insertHTML", false, "<pre><code>// 代码块</code></pre>");
      });
    }
    setBlockMenuOpen(false);
  };

  const reorderToolbar = (fromId: string, toId: string): void => {
    if (!fromId || fromId === toId) return;
    setToolbarOrder((prev) => {
      const normalized = normalizeToolbarOrder(prev);
      const fromIdx = normalized.indexOf(fromId);
      const toIdx = normalized.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return normalized;
      const next = [...normalized];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const createRootFolder = (): void => {
    const rootNames = folders.map((f) => f.name);
    const name = nextName("新文件夹", rootNames);
    const folder: FolderNode = { id: genId("folder"), name, children: [] };
    setFolders((prev) => [...prev, folder]);
    setSelectedFolderId(folder.id);
  };

  const createChildFolder = (folderId: string): void => {
    const parent = findFolder(folders, folderId);
    const siblingNames = parent?.children.map((c) => c.name) ?? [];
    const name = nextName("新建文件夹", siblingNames);
    const folder: FolderNode = { id: genId("folder"), name, children: [] };
    setFolders((prev) => insertChild(prev, folderId, folder));
    setExpandedIds((prev) => (prev.includes(folderId) ? prev : [...prev, folderId]));
    setSelectedFolderId(folder.id);
  };

  const renameFolderAction = (folderId: string): void => {
    const target = findFolder(folders, folderId);
    if (!target) return;
    setRenamingFolderId(folderId);
    setRenamingFolderDraft(target.name);
  };

  const commitRenameFolder = (): void => {
    if (!renamingFolderId) return;
    const nextName = renamingFolderDraft.trim();
    if (!nextName) {
      setRenamingFolderId("");
      setRenamingFolderDraft("");
      return;
    }
    setFolders((prev) => renameFolderTree(prev, renamingFolderId, nextName));
    setRenamingFolderId("");
    setRenamingFolderDraft("");
  };

  const cancelRenameFolder = (): void => {
    setRenamingFolderId("");
    setRenamingFolderDraft("");
  };

  const deleteFolderAction = (folderId: string): void => {
    const target = findFolder(folders, folderId);
    if (!target) return;
    if (!window.confirm(`删除文件夹 ${target.name} 及内部内容？`)) return;

    const removedSet = new Set(collectFolderIds(target));
    const result = removeNode(folders, folderId);
    if (result.next.length === 0) return;

    setFolders(result.next);
    setExpandedIds((prev) => prev.filter((id) => !removedSet.has(id)));
    setNoteList((prev) => prev.filter((note) => !removedSet.has(note.folderId)));
    if (removedSet.has(selectedFolderId)) setSelectedFolderId(result.next[0].id);
  };

  const createNoteInFolder = (folderId: string): void => {
    const exists = noteList.filter((note) => note.folderId === folderId).map((note) => note.title);
    const title = nextFileName("未命名", exists);

    const note: RichNote = {
      id: genId("note"),
      folderId,
      title,
      contentHtml: "<p></p>",
      updatedAt: Date.now()
    };

    setNoteList((prev) => [...prev, note]);
    setCurrentNoteId(note.id);
    setSelectedFolderId(folderId);
    setEditorMode("edit");
    setExpandedIds((prev) => (prev.includes(folderId) ? prev : [...prev, folderId]));
    setRenamingNoteId(note.id);
    setRenamingDraft(title.replace(/\.md$/i, ""));
  };

  const renameNoteById = (noteId: string): void => {
    const target = noteList.find((note) => note.id === noteId);
    if (!target) return;
    setRenamingNoteId(noteId);
    setRenamingDraft(target.title.replace(/\.md$/i, ""));
  };

  const commitRenameNote = (): void => {
    if (!renamingNoteId) return;
    const nextTitle = ensureMdFileName(renamingDraft);
    setNoteList((prev) => prev.map((note) => (note.id === renamingNoteId ? { ...note, title: nextTitle } : note)));
    setRenamingNoteId("");
    setRenamingDraft("");
  };

  const cancelRenameNote = (): void => {
    setRenamingNoteId("");
    setRenamingDraft("");
  };

  const deleteNoteById = (noteId: string): void => {
    const target = noteList.find((note) => note.id === noteId);
    if (!target) return;
    if (!window.confirm(`删除文件 ${target.title} ?`)) return;
    setNoteList((prev) => prev.filter((note) => note.id !== noteId));
  };

  const deleteCurrentNote = (): void => {
    if (!currentNote) {
      window.alert("请先在左侧选择一个文件后再删除。");
      return;
    }
    deleteNoteById(currentNote.id);
  };

  const copyFolderAction = (folderId: string): void => {
    const node = findFolder(folders, folderId);
    if (!node) return;
    setClipboard({ mode: "copy", node });
    setSaveText(`已复制文件夹: ${node.name}`);
  };

  const cutFolderAction = (folderId: string): void => {
    const node = findFolder(folders, folderId);
    if (!node) return;
    setClipboard({ mode: "cut", node });
    setSaveText(`已剪切文件夹: ${node.name}`);
  };

  const canPasteToTarget = (targetFolderId: string): boolean => {
    if (!clipboard) return false;
    if (clipboard.mode === "cut" && containsFolder(clipboard.node, targetFolderId)) return false;
    return true;
  };

  const pasteFolderAction = (targetFolderId: string): void => {
    if (!clipboard) return;
    if (!canPasteToTarget(targetFolderId)) {
      window.alert("不能粘贴到当前目录或其子目录");
      return;
    }

    if (clipboard.mode === "cut") {
      const removed = removeNode(folders, clipboard.node.id);
      if (!removed.removedNode) return;
      const next = insertChild(removed.next, targetFolderId, removed.removedNode);
      setFolders(next);
      setExpandedIds((prev) => (prev.includes(targetFolderId) ? prev : [...prev, targetFolderId]));
      setSelectedFolderId(removed.removedNode.id);
      setClipboard(null);
      setSaveText(`已移动到新目录: ${removed.removedNode.name}`);
      return;
    }

    const map = new Map<string, string>();
    const cloned = cloneFolderWithMap(clipboard.node, map);
    setFolders((prev) => insertChild(prev, targetFolderId, cloned));
    setExpandedIds((prev) => (prev.includes(targetFolderId) ? prev : [...prev, targetFolderId]));
    setSelectedFolderId(cloned.id);

    const sourceIds = new Set(map.keys());
    const copiedNotes = noteList
      .filter((note) => sourceIds.has(note.folderId))
      .map((note) => ({
        ...note,
        id: genId("note"),
        folderId: map.get(note.folderId) || note.folderId,
        title: ensureMdFileName(`${note.title.replace(/\.md$/i, "")}-副本`),
        updatedAt: Date.now()
      }));

    if (copiedNotes.length > 0) setNoteList((prev) => [...prev, ...copiedNotes]);
    setSaveText(`已粘贴副本: ${cloned.name}`);
  };

  const viewDirectoryAction = (folderId: string): void => {
    setSelectedFolderId(folderId);
    setExpandedIds((prev) => (prev.includes(folderId) ? prev : [...prev, folderId]));
  };

  const onEditorInput = (): void => {
    if (!editorRef.current) return;
    updateCurrentNote(editorRef.current.innerHTML);
    updateFormatState();
  };

  const onEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>): void => {
    if (editorMode !== "edit" || !editorRef.current) return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData("text/html");
    if (html) {
      event.preventDefault();
      document.execCommand("insertHTML", false, sanitizeUnsupportedHtml(html));
      updateCurrentNote(editorRef.current.innerHTML);
      updateSelectionMenu();
      updateFormatState();
      return;
    }

    const text = clipboard.getData("text/plain");
    if (text) {
      event.preventDefault();
      document.execCommand("insertText", false, text);
      updateCurrentNote(editorRef.current.innerHTML);
      updateSelectionMenu();
      updateFormatState();
    }
  };

  const toggleExpand = (folderId: string): void => {
    setExpandedIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]));
  };

  const openContextMenu = (event: React.MouseEvent, folderId: string): void => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFolderId(folderId);
    setContextMenu({ x: event.clientX, y: event.clientY, folderId, targetType: "folder" });
  };

  const openNoteContextMenu = (event: React.MouseEvent, folderId: string, noteId: string): void => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFolderId(folderId);
    setCurrentNoteId(noteId);
    setContextMenu({ x: event.clientX, y: event.clientY, folderId, noteId, targetType: "note" });
  };

  const openTreeAreaContextMenu = (event: React.MouseEvent): void => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    if (!selectedFolder) return;
    setContextMenu({ x: event.clientX, y: event.clientY, folderId: selectedFolder.id, targetType: "folder" });
  };

  const runContextAction = (fn: () => void): void => {
    fn();
    setContextMenu(null);
  };

  const manualRefresh = (): void => {
    const parse = <T,>(key: string): T | null => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    };

    const nextFolders = parse<FolderNode[]>("cloudo.notes.tree");
    const nextExpanded = parse<string[]>("cloudo.notes.expanded");
    const nextSelectedFolderId = parse<string>("cloudo.notes.selectedFolder");
    const nextPaneWidth = parse<number>("cloudo.notes.leftPaneWidth");
    const nextNotes = parse<RichNote[]>("cloudo.notes.richList");
    const nextCurrentNote = parse<string>("cloudo.notes.currentNote");

    if (nextFolders) setFolders(nextFolders);
    if (nextExpanded) setExpandedIds(nextExpanded);
    if (nextSelectedFolderId) setSelectedFolderId(nextSelectedFolderId);
    if (typeof nextPaneWidth === "number") setLeftPaneWidth(nextPaneWidth);
    if (nextNotes) setNoteList(nextNotes);
    if (nextCurrentNote) setCurrentNoteId(nextCurrentNote);
    setSaveText("已刷新");
  };

  const toggleTocNode = (tocId: string): void => {
    setTocCollapsedIds((prev) => (prev.includes(tocId) ? prev.filter((id) => id !== tocId) : [...prev, tocId]));
  };

  const jumpToToc = (tocId: string): void => {
    const targetNode = tocFlat.find((item) => item.id === tocId);
    if (!targetNode) return;
    const pane = editorMode === "edit" ? editorRef.current : previewRef.current;
    if (!pane) return;
    const headings = pane.querySelectorAll("h1,h2,h3,h4");
    const target = headings[targetNode.index] as HTMLElement | undefined;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add("toc-jump-flash");
    setFlashHeadingIndex(targetNode.index);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      target.classList.remove("toc-jump-flash");
      setFlashHeadingIndex((prev) => (prev === targetNode.index ? null : prev));
      flashTimerRef.current = null;
    }, 1000);
    setActiveTocId(tocId);
  };

  const rebuildTocOffsets = useCallback((): void => {
    const pane = editorMode === "edit" ? editorRef.current : previewRef.current;
    if (!pane || tocFlat.length === 0) {
      tocOffsetsRef.current = [];
      return;
    }
    const headings = pane.querySelectorAll("h1,h2,h3,h4");
    tocOffsetsRef.current = Array.from(headings, (heading) => (heading as HTMLElement).offsetTop);
  }, [editorMode, tocFlat.length, currentNoteId, sanitizedCurrentHtml]);

  const syncActiveTocByScroll = useCallback((): void => {
    const pane = editorMode === "edit" ? editorRef.current : previewRef.current;
    const offsets = tocOffsetsRef.current;
    if (!pane || tocFlat.length === 0 || offsets.length === 0) {
      setActiveTocId((prev) => (prev ? "" : prev));
      return;
    }
    const scrollMark = pane.scrollTop + 28;
    let left = 0;
    let right = offsets.length - 1;
    let activeIndex = 0;
    while (left <= right) {
      const mid = (left + right) >> 1;
      if (offsets[mid] <= scrollMark) {
        activeIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    const nextId = tocFlat.find((item) => item.index === activeIndex)?.id ?? "";
    setActiveTocId((prev) => (prev === nextId ? prev : nextId));
  }, [editorMode, tocFlat]);

  const addComment = (): void => {
    if (!currentNoteId) return;
    const text = commentDraft.trim();
    if (!text) return;
    let commentId = genId("cmt");
    let quote: string | undefined;

    const pending = pendingCommentSelectionRef.current;
    if (pending && editorMode === "edit" && editorRef.current) {
      try {
        const range = pending.range.cloneRange();
        const anchor = document.createElement("span");
        anchor.className = "inline-comment-highlight";
        anchor.dataset.commentId = commentId;
        anchor.appendChild(range.extractContents());
        range.insertNode(anchor);
        quote = pending.quote;
        updateCurrentNote(editorRef.current.innerHTML);
      } catch {
        window.alert("选区已失效，请重新选择后再评论");
        return;
      } finally {
        pendingCommentSelectionRef.current = null;
      }
    }

    const item: NoteComment = { id: commentId, text, createdAt: Date.now(), quote };
    setCommentsByNote((prev) => {
      const list = prev[currentNoteId] || [];
      return { ...prev, [currentNoteId]: [item, ...list] };
    });
    setCommentDraft("");
  };

  const focusCommentAnchor = (commentId: string): void => {
    const pane = editorMode === "edit" ? editorRef.current : previewRef.current;
    if (!pane) return;
    const nodes = Array.from(pane.querySelectorAll(".inline-comment-highlight"));
    const target = nodes.find((node) => (node as HTMLElement).dataset.commentId === commentId) as HTMLElement | undefined;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("comment-highlight-flash");
    window.setTimeout(() => {
      target.classList.remove("comment-highlight-flash");
    }, 1000);
  };

  const startSelectionCommentInput = (): void => {
    if (!currentNoteId || editorMode !== "edit" || !editorRef.current) return;
    const selection = window.getSelection();
    let range: Range | null = null;
    if (savedRangeRef.current) range = savedRangeRef.current.cloneRange();
    else if (selection && selection.rangeCount > 0 && !selection.isCollapsed) range = selection.getRangeAt(0).cloneRange();
    if (!range) {
      window.alert("请先选中一段文字");
      return;
    }
    const commonNode = range.commonAncestorContainer;
    const withinEditor =
      commonNode instanceof Node &&
      (editorRef.current.contains(commonNode) || commonNode === editorRef.current);
    if (!withinEditor) {
      window.alert("请先在正文里选中文字");
      return;
    }

    ensureFocus();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const quote = range.toString().trim();
    if (!quote) {
      window.alert("请先选中一段文字");
      return;
    }
    pendingCommentSelectionRef.current = { range: range.cloneRange(), quote };

    if (commentPanelCollapsed) setCommentPanelCollapsed(false);
    window.requestAnimationFrame(() => commentInputRef.current?.focus());

    savedRangeRef.current = null;
    setSelectionMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    setSelectionContext((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    setSaveText("已选择文本，请在评论区输入并发布");
  };

  const deleteComment = (commentId: string): void => {
    if (!currentNoteId) return;
    setCommentsByNote((prev) => {
      const list = prev[currentNoteId] || [];
      return { ...prev, [currentNoteId]: list.filter((item) => item.id !== commentId) };
    });
    if (!currentNote) return;
    const cleaned = removeCommentAnchorFromHtml(currentNote.contentHtml, commentId);
    if (cleaned === currentNote.contentHtml) return;
    setNoteList((prev) =>
      prev.map((note) => (note.id === currentNote.id ? { ...note, contentHtml: cleaned, updatedAt: Date.now() } : note))
    );
    if (editorMode === "edit" && editorRef.current) editorRef.current.innerHTML = cleaned;
    pendingSaveRef.current = null;
  };

  const updateSelectionMenu = (): void => {
    if (editorMode !== "edit" || !editorRef.current) {
      savedRangeRef.current = null;
      setSelectionMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setFormatState({ bold: false, italic: false, underline: false, ordered: false, unordered: false, align: "left", block: "paragraph" });
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      savedRangeRef.current = null;
      setSelectionMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      updateFormatState();
      return;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    const withinEditor =
      commonNode instanceof Node &&
      (editorRef.current.contains(commonNode) || commonNode === editorRef.current);

    if (!withinEditor) {
      savedRangeRef.current = null;
      setSelectionMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setFormatState({ bold: false, italic: false, underline: false, ordered: false, unordered: false, align: "left", block: "paragraph" });
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      savedRangeRef.current = null;
      setSelectionMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      updateFormatState();
      return;
    }

    savedRangeRef.current = range.cloneRange();

    setSelectionMenu({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 14
    });
    updateFormatState();
  };

  const openSelectionContextMenu = (event: React.MouseEvent): void => {
    if (editorMode !== "edit" || !editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    const withinEditor =
      commonNode instanceof Node &&
      (editorRef.current.contains(commonNode) || commonNode === editorRef.current);
    if (!withinEditor) return;
    savedRangeRef.current = range.cloneRange();
    event.preventDefault();
    setSelectionContext({ visible: true, x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const onSelectionChange = (): void => {
      if (editorMode !== "edit") return;
      updateSelectionMenu();
    };
    const onScroll = (): void => {
      if (!selectionMenu.visible && !selectionContext.visible) return;
      updateSelectionMenu();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    if (selectionMenu.visible || selectionContext.visible) {
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
    }
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (selectionMenu.visible || selectionContext.visible) {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
      }
    };
  }, [editorMode, selectionMenu.visible, selectionContext.visible]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      flushPendingSave();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [flushPendingSave]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [currentNoteId, flushPendingSave]);

  useEffect(() => {
    setToolbarOrder((prev) => normalizeToolbarOrder(prev));
  }, [setToolbarOrder]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      for (const timer of capsuleTimersRef.current.values()) window.clearTimeout(timer);
      capsuleTimersRef.current.clear();
      for (const rafId of capsuleRafRef.current.values()) window.cancelAnimationFrame(rafId);
      capsuleRafRef.current.clear();
      capsulePulseRef.current.clear();
      capsuleMetricsRef.current.clear();
      if (tocSyncRafRef.current !== null) {
        window.cancelAnimationFrame(tocSyncRafRef.current);
        tocSyncRafRef.current = null;
      }
      if (tocSyncTimerRef.current !== null) {
        window.clearTimeout(tocSyncTimerRef.current);
        tocSyncTimerRef.current = null;
      }
    };
  }, []);

  const recalcCapsuleMetrics = useCallback((host: HTMLElement): void => {
    const target =
      host.dataset.capsuleTarget === "editor-pane"
        ? (editorMode === "edit" ? editorRef.current : previewRef.current)
        : host;
    if (!target) {
      capsuleMetricsRef.current.delete(host);
      host.style.setProperty("--capsule-visible", "0");
      host.style.setProperty("--capsule-top", "0px");
      host.style.setProperty("--capsule-height", "0px");
      return;
    }
    const scrollRange = target.scrollHeight - target.clientHeight;
    if (target.clientHeight <= 0 || scrollRange <= 1) {
      capsuleMetricsRef.current.delete(host);
      host.style.setProperty("--capsule-visible", "0");
      host.style.setProperty("--capsule-top", "0px");
      host.style.setProperty("--capsule-height", "0px");
      return;
    }
    const trackHeight = Math.max(target.clientHeight - CAPSULE_TRACK_PADDING * 2, 0);
    const thumbHeight = Math.min(
      trackHeight,
      Math.max(CAPSULE_MIN_SIZE, Math.round((target.clientHeight / target.scrollHeight) * trackHeight))
    );
    const maxTop = Math.max(trackHeight - thumbHeight, 0);
    capsuleMetricsRef.current.set(host, { scrollRange, maxTop, thumbHeight });
    host.style.setProperty("--capsule-visible", "1");
    host.style.setProperty("--capsule-height", `${thumbHeight}px`);
  }, [editorMode, currentNoteId]);

  const syncCapsuleScrollbar = useCallback((host: HTMLElement): void => {
    const target =
      host.dataset.capsuleTarget === "editor-pane"
        ? (editorMode === "edit" ? editorRef.current : previewRef.current)
        : host;
    if (!target) return;
    let metrics = capsuleMetricsRef.current.get(host);
    if (!metrics) {
      recalcCapsuleMetrics(host);
      metrics = capsuleMetricsRef.current.get(host);
    }
    if (!metrics) return;
    const thumbTop = CAPSULE_TRACK_PADDING + (target.scrollTop / metrics.scrollRange) * metrics.maxTop;
    const visualTop = target === host ? thumbTop + target.scrollTop : thumbTop;
    host.style.setProperty("--capsule-top", `${visualTop}px`);
  }, [recalcCapsuleMetrics, editorMode, currentNoteId]);

  const syncAllCapsuleScrollbars = useCallback((): void => {
    const scope = workspaceRef.current;
    if (!scope) return;
    scope.querySelectorAll<HTMLElement>(".capsule-scrollbar").forEach((host) => {
      recalcCapsuleMetrics(host);
      syncCapsuleScrollbar(host);
    });
  }, [recalcCapsuleMetrics, syncCapsuleScrollbar]);

  const queueSyncCapsuleScrollbar = useCallback((host: HTMLElement): void => {
    const rafs = capsuleRafRef.current;
    const pending = rafs.get(host);
    if (typeof pending === "number") return;
    const rafId = window.requestAnimationFrame(() => {
      syncCapsuleScrollbar(host);
      rafs.delete(host);
    });
    rafs.set(host, rafId);
  }, [syncCapsuleScrollbar]);

  const activateCapsuleScrollbar = useCallback((host: HTMLElement): void => {
    const now = performance.now();
    const pulses = capsulePulseRef.current;
    const prevPulse = pulses.get(host) ?? 0;
    if (host.classList.contains("capsule-active") && now - prevPulse < 120) return;
    pulses.set(host, now);
    host.classList.add("capsule-active");
    const timers = capsuleTimersRef.current;
    const prev = timers.get(host);
    if (typeof prev === "number") window.clearTimeout(prev);
    const timer = window.setTimeout(() => {
      host.classList.remove("capsule-active");
      timers.delete(host);
      pulses.delete(host);
    }, CAPSULE_IDLE_MS);
    timers.set(host, timer);
  }, []);

  useEffect(() => {
    const scope = workspaceRef.current;
    if (!scope) return;
    const hosts = Array.from(scope.querySelectorAll<HTMLElement>(".capsule-scrollbar"));
    const bindings: Array<{ host: HTMLElement; target: HTMLElement; onTargetActivity: () => void; onFocusIn: () => void }> = [];
    hosts.forEach((host) => {
      const target =
        host.dataset.capsuleTarget === "editor-pane"
          ? (editorMode === "edit" ? editorRef.current : previewRef.current)
          : host;
      if (!(target instanceof HTMLElement)) return;
      const onTargetActivity = (): void => {
        queueSyncCapsuleScrollbar(host);
        activateCapsuleScrollbar(host);
      };
      const onFocusIn = (): void => {
        queueSyncCapsuleScrollbar(host);
        activateCapsuleScrollbar(host);
      };
      queueSyncCapsuleScrollbar(host);
      target.addEventListener("scroll", onTargetActivity, { passive: true });
      target.addEventListener("pointerdown", onTargetActivity, { passive: true });
      host.addEventListener("focusin", onFocusIn);
      bindings.push({ host, target, onTargetActivity, onFocusIn });
    });
    return () => {
      bindings.forEach(({ host, target, onTargetActivity, onFocusIn }) => {
        target.removeEventListener("scroll", onTargetActivity);
        target.removeEventListener("pointerdown", onTargetActivity);
        host.removeEventListener("focusin", onFocusIn);
      });
    };
  }, [
    queueSyncCapsuleScrollbar,
    activateCapsuleScrollbar,
    currentNoteId,
    editorMode,
    focusMode,
    treePanelCollapsed,
    tocPanelCollapsed,
    commentPanelCollapsed
  ]);

  useEffect(() => {
    syncAllCapsuleScrollbars();
    const onResize = (): void => syncAllCapsuleScrollbars();
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", onResize);
      };
    }
    const observer = new ResizeObserver(() => syncAllCapsuleScrollbars());
    const scope = workspaceRef.current;
    if (scope) {
      observer.observe(scope);
      scope.querySelectorAll<HTMLElement>(".capsule-scrollbar").forEach((host) => observer.observe(host));
    }
    return () => {
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [syncAllCapsuleScrollbars]);

  useEffect(() => {
    syncAllCapsuleScrollbars();
  }, [syncAllCapsuleScrollbars, currentNoteId, editorMode, focusMode, treePanelCollapsed, tocPanelCollapsed, commentPanelCollapsed]);

  useEffect(() => {
    rebuildTocOffsets();
    syncActiveTocByScroll();
  }, [rebuildTocOffsets, syncActiveTocByScroll]);

  useEffect(() => {
    const pane = editorMode === "edit" ? editorRef.current : previewRef.current;
    if (!pane) return;
    const onScroll = (): void => {
      if (tocSyncTimerRef.current !== null) return;
      tocSyncTimerRef.current = window.setTimeout(() => {
        tocSyncTimerRef.current = null;
        if (tocSyncRafRef.current !== null) return;
        tocSyncRafRef.current = window.requestAnimationFrame(() => {
          tocSyncRafRef.current = null;
          syncActiveTocByScroll();
        });
      }, 80);
    };
    pane.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      pane.removeEventListener("scroll", onScroll);
      if (tocSyncTimerRef.current !== null) {
        window.clearTimeout(tocSyncTimerRef.current);
        tocSyncTimerRef.current = null;
      }
      if (tocSyncRafRef.current !== null) {
        window.cancelAnimationFrame(tocSyncRafRef.current);
        tocSyncRafRef.current = null;
      }
    };
  }, [editorMode, currentNoteId, syncActiveTocByScroll]);

  const toolbarButtons: Record<string, JSX.Element> = {
    undo: <button type="button" className="icon-btn large draggable-tool" title="撤销" onClick={() => runCommand("undo")}><Undo2 size={18} /></button>,
    redo: <button type="button" className="icon-btn large draggable-tool" title="重做" onClick={() => runCommand("redo")}><Redo2 size={18} /></button>,
    blockMenu: (
      <button
        type="button"
        className={blockMenuOpen || formatState.block !== "paragraph" ? "icon-btn large active menu-trigger draggable-tool" : "icon-btn large menu-trigger draggable-tool"}
        title="段落与列表"
        onClick={(event) => {
          event.stopPropagation();
          const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
          if (blockMenuOpen) {
            setBlockMenuOpen(false);
            return;
          }
          openBlockMenuAt(rect.left, rect.bottom + 8, false);
        }}
      >
        <List size={18} />
        <ChevronDown size={14} />
      </button>
    ),
    ordered: <button type="button" className={formatState.ordered ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="有序列表" onClick={() => runCommand("insertOrderedList")}><ListOrdered size={18} /></button>,
    link: <button type="button" className="icon-btn large draggable-tool" title="链接" onClick={insertLink}><Link2 size={18} /></button>,
    code: <button type="button" className="icon-btn large draggable-tool" title="代码" onClick={insertCode}><Code size={18} /></button>,
    alignLeft: <button type="button" className={formatState.align === "left" ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="左对齐" onClick={() => runCommand("justifyLeft")}><AlignLeft size={18} /></button>,
    alignCenter: <button type="button" className={formatState.align === "center" ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="居中" onClick={() => runCommand("justifyCenter")}><AlignCenter size={18} /></button>,
    alignRight: <button type="button" className={formatState.align === "right" ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="右对齐" onClick={() => runCommand("justifyRight")}><AlignRight size={18} /></button>,
    clear: <button type="button" className="icon-btn large draggable-tool" title="清除格式" onClick={() => { runCommand("removeFormat"); runCommand("formatBlock", "<p>"); }}><RemoveFormatting size={18} /></button>,
    bold: <button type="button" className={formatState.bold ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="加粗" onClick={() => runCommand("bold")}><Bold size={18} /></button>,
    italic: <button type="button" className={formatState.italic ? "icon-btn large draggable-tool active" : "icon-btn large draggable-tool"} title="斜体" onClick={() => runCommand("italic")}><Italic size={18} /></button>,
    delete: <button type="button" className="icon-btn large draggable-tool" title="删除文件" onClick={deleteCurrentNote}><Trash2 size={18} /></button>
  };

  const renderTree = (nodes: FolderNode[], depth = 0): JSX.Element[] => {
    return nodes.flatMap((folder) => {
      const expanded = expandedIds.includes(folder.id);
      const notesInFolder = notesByFolder.get(folder.id) || [];

      const folderRow = (
        <div
          key={folder.id}
          className="tree-row"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
          onContextMenu={(event) => openContextMenu(event, folder.id)}
        >
          <button
            type="button"
            className="tree-toggle"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpand(folder.id);
            }}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Folder size={16} className="line-icon" />
          {renamingFolderId === folder.id ? (
            <input
              className="tree-inline-input"
              autoFocus
              value={renamingFolderDraft}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenamingFolderDraft(event.target.value)}
              onBlur={commitRenameFolder}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRenameFolder();
                if (event.key === "Escape") cancelRenameFolder();
              }}
            />
          ) : (
            <span>{folder.name}</span>
          )}
        </div>
      );

      if (!expanded) return [folderRow];

      const noteRows = notesInFolder.map((note) => (
        <div
          key={note.id}
          className={currentNoteId === note.id ? "tree-row note active" : "tree-row note"}
          style={{ paddingLeft: `${28 + depth * 14}px` }}
          onClick={() => {
            setSelectedFolderId(folder.id);
            setExpandedIds((prev) => (prev.includes(folder.id) ? prev : [...prev, folder.id]));
            setCurrentNoteId(note.id);
            setEditorMode("edit");
          }}
          onContextMenu={(event) => openNoteContextMenu(event, folder.id, note.id)}
        >
          <span className="tree-toggle" />
          <FileText size={15} className="line-icon" />
          {renamingNoteId === note.id ? (
            <input
              className="tree-inline-input"
              autoFocus
              value={renamingDraft}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenamingDraft(event.target.value)}
              onBlur={commitRenameNote}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRenameNote();
                if (event.key === "Escape") cancelRenameNote();
              }}
            />
          ) : (
            <span>{note.title}</span>
          )}
        </div>
      ));

      return [folderRow, ...noteRows, ...renderTree(folder.children, depth + 1)];
    });
  };

  const renderTocTree = (nodes: TocHeadingNode[], depth = 0): JSX.Element[] => {
    return nodes.flatMap((node) => {
      const collapsed = tocCollapsedIds.includes(node.id);
      const hasChildren = node.children.length > 0;
      const row = (
        <div
          key={node.id}
          className={activeTocId === node.id ? "toc-row active" : "toc-row"}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          onClick={() => jumpToToc(node.id)}
          title={node.text}
        >
          {hasChildren ? (
            <button
              type="button"
              className="tree-toggle"
              onClick={(event) => {
                event.stopPropagation();
                toggleTocNode(node.id);
              }}
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span className="tree-toggle" />
          )}
          <span className="toc-text">{node.text}</span>
        </div>
      );

      if (!hasChildren || collapsed) return [row];
      return [row, ...renderTocTree(node.children, depth + 1)];
    });
  };

  const wordCount = useMemo(() => stripHtml(sanitizedCurrentHtml).length, [sanitizedCurrentHtml]);
  const copyAllText = async (): Promise<void> => {
    if (!currentNote) return;
    const plainText = stripHtml(currentNote.contentHtml);
    try {
      await navigator.clipboard.writeText(plainText);
      setSaveText("已复制全文");
    } catch {
      setSaveText("复制失败，请检查剪贴板权限");
    }
  };

  return (
    <section className="page notes-page notes-page-clean">
      <header className="notes-meta-bar">
        <div className="notes-meta-left">
          <div className="meta-line">本地目录: {baseDir || "加载中..."}</div>
          <div className="meta-line">{breadcrumb}</div>
          <div className="meta-line subtle">{saveText}</div>
        </div>
        <div className="notes-meta-right">
          <span className="meta-chip">字数: {wordCount}</span>
          <button type="button" className="tiny-btn" onClick={copyAllText}>全文复制</button>
        </div>
      </header>
      <div
        ref={workspaceRef}
        className="notes-workspace clean"
        style={{ gridTemplateColumns: `${computedLeftPaneWidth}px ${computedLeftDividerWidth}px 1fr` }}
      >
        <aside className={treePanelCollapsed || focusMode ? "panel notes-tree-panel clean collapsed icon-rail" : "panel notes-tree-panel clean"}>
          <div className="tree-toolbar icons">
            <button
              type="button"
              className={treePanelCollapsed || focusMode ? "icon-btn large rail-toggle-btn" : "icon-btn large"}
              title={treePanelCollapsed ? "展开文件树" : "折叠文件树"}
              onClick={toggleTreePanel}
            >
              {treePanelCollapsed ? <Folder size={18} /> : <ChevronLeft size={18} />}
            </button>
            {!treePanelCollapsed && !focusMode ? (
              <>
                <button type="button" className="icon-btn large" title="新建文件" onClick={() => selectedFolder && createNoteInFolder(selectedFolder.id)}>
                  <FilePlus2 size={18} />
                </button>
                <button type="button" className="icon-btn large" title="新建文件夹" onClick={createRootFolder}>
                  <FolderPlus size={18} />
                </button>
                <button type="button" className="icon-btn large" title="刷新" onClick={manualRefresh}>
                  <RefreshCw size={18} />
                </button>
                <button type="button" className="icon-btn large" title="导入" onClick={() => window.alert("后续接入导入") }>
                  <Upload size={18} />
                </button>
              </>
            ) : null}
          </div>
          {!treePanelCollapsed && !focusMode ? (
            <div
              ref={treeContainerRef}
              className="tree-container clean capsule-scrollbar"
              tabIndex={-1}
              onContextMenu={openTreeAreaContextMenu}
            >
              {renderTree(folders)}
            </div>
          ) : null}
        </aside>

        {!focusMode ? (
          <div className="notes-divider" onMouseDown={startResize} role="separator" aria-label="调整左右面板宽度" />
        ) : (
          <div />
        )}

        <section className="panel notes-editor-panel clean">
          <div className="editor-toolbar icons in-editor">
            <button type="button" className="icon-btn large" title="撤销" onClick={() => runCommand("undo")}><Undo2 size={18} /></button>
            <button type="button" className="icon-btn large" title="重做" onClick={() => runCommand("redo")}><Redo2 size={18} /></button>
            <span className="divider" />
            {toolbarButtons.blockMenu}
            <button type="button" className={formatState.bold ? "icon-btn large active" : "icon-btn large"} title="加粗" onClick={() => runCommand("bold")}><Bold size={18} /></button>
            <button type="button" className={formatState.italic ? "icon-btn large active" : "icon-btn large"} title="斜体" onClick={() => runCommand("italic")}><Italic size={18} /></button>
            <button type="button" className={formatState.ordered ? "icon-btn large active" : "icon-btn large"} title="有序列表" onClick={() => runCommand("insertOrderedList")}><ListOrdered size={18} /></button>
            <button type="button" className="icon-btn large" title="链接" onClick={insertLink}><Link2 size={18} /></button>
            <button type="button" className="icon-btn large" title="清除格式" onClick={() => { runCommand("removeFormat"); runCommand("formatBlock", "<p>"); }}><RemoveFormatting size={18} /></button>
            <div className="more-wrap">
              <button
                type="button"
                className={moreMenuOpen ? "icon-btn large active" : "icon-btn large"}
                title="更多"
                onClick={(event) => {
                  event.stopPropagation();
                  setMoreMenuOpen((prev) => !prev);
                }}
              >
                ...
              </button>
              {moreMenuOpen ? (
                <div className="more-menu" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => { runCommand("justifyLeft"); setMoreMenuOpen(false); }}>左对齐</button>
                  <button type="button" onClick={() => { runCommand("justifyCenter"); setMoreMenuOpen(false); }}>居中</button>
                  <button type="button" onClick={() => { runCommand("justifyRight"); setMoreMenuOpen(false); }}>右对齐</button>
                  <button type="button" onClick={() => { insertCode(); setMoreMenuOpen(false); }}>代码</button>
                </div>
              ) : null}
            </div>
            <span className="divider" />
            <button type="button" className={editorMode === "edit" ? "icon-btn large active" : "icon-btn large"} title="编辑模式" onClick={() => setEditorMode("edit")}><Pencil size={18} /></button>
            <button type="button" className={editorMode === "preview" ? "icon-btn large active" : "icon-btn large"} title="预览模式" onClick={() => setEditorMode("preview")}><Eye size={18} /></button>
            <button type="button" className={focusMode ? "icon-btn large active" : "icon-btn large"} title="纯净写作模式" onClick={toggleFocusMode}>
              {focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
          <div
            ref={editorBodyRef}
            className="notes-editor-body"
            style={{ gridTemplateColumns: `${computedTocPaneWidth}px ${computedTocDividerWidth}px 1fr ${computedCommentDividerWidth}px ${computedCommentPaneWidth}px` }}
          >
            <aside className={tocPanelCollapsed || focusMode ? "toc-panel collapsed icon-rail" : "toc-panel"}>
              <div className="toc-title-row">
                {!tocPanelCollapsed && !focusMode ? <span>目录</span> : null}
                {!tocPanelCollapsed && !focusMode ? <span className="soft-text">{tocFlat.length}</span> : null}
                <button
                  type="button"
                  className={tocPanelCollapsed || focusMode ? "tree-toggle rail-toggle-btn" : "tree-toggle"}
                  title={tocPanelCollapsed ? "展开目录" : "折叠目录"}
                  onClick={toggleTocPanel}
                >
                  {tocPanelCollapsed ? <List size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>
              {!tocPanelCollapsed && !focusMode ? (
                <div
                  ref={tocTreeRef}
                  className="toc-tree capsule-scrollbar"
                  tabIndex={-1}
                >
                  {tocTree.length > 0 ? renderTocTree(tocTree) : <div className="toc-empty">当前文档暂无 H1-H4 标题</div>}
                </div>
              ) : null}
            </aside>
            {!focusMode ? (
              <div className="toc-divider" onMouseDown={startTocResize} role="separator" aria-label="调整目录宽度" />
            ) : (
              <div />
            )}
            <div ref={editorMainRef} className="notes-editor-main capsule-scrollbar" data-capsule-target="editor-pane">
              <div className="notes-editor-canvas">
                {editorMode === "edit" ? (
                  <div
                    ref={editorRef}
                    className="wysiwyg-editor clean capsule-scroll-target"
                    contentEditable
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    suppressContentEditableWarning
                    onInput={onEditorInput}
                    onPaste={onEditorPaste}
                    onMouseUp={updateSelectionMenu}
                    onKeyUp={updateSelectionMenu}
                    onContextMenu={openSelectionContextMenu}
                  />
                ) : (
                  <article
                    ref={previewRef}
                    className="wysiwyg-preview clean capsule-scroll-target"
                    dangerouslySetInnerHTML={{ __html: sanitizedCurrentHtml }}
                  />
                )}
              </div>
            </div>
            {!focusMode ? (
              <div className="comment-divider" onMouseDown={startCommentResize} role="separator" aria-label="调整批注宽度" />
            ) : (
              <div />
            )}
            <aside className={commentPanelCollapsed || focusMode ? "comment-panel collapsed" : "comment-panel"}>
              <div className="comment-title-row">
                {!commentPanelCollapsed && !focusMode ? <span>评论与批注</span> : null}
                {!commentPanelCollapsed && !focusMode ? <span className="soft-text">{currentComments.length}</span> : null}
                <button
                  type="button"
                  className="tree-toggle"
                  title={commentPanelCollapsed ? "展开批注" : "折叠批注"}
                  onClick={toggleCommentPanel}
                >
                  {commentPanelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
              {!commentPanelCollapsed && !focusMode ? (
                <>
                  <div className="comment-compose">
                    <textarea
                      ref={commentInputRef}
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      placeholder="输入评论，回车提交（Shift+回车换行）"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          addComment();
                        }
                      }}
                    />
                    <button type="button" className="tiny-btn" onClick={addComment}>发布</button>
                  </div>
                  <div
                    className="comment-list capsule-scrollbar"
                  >
                    {currentComments.length === 0 ? <div className="comment-empty">暂无评论</div> : null}
                    {currentComments.map((item) => (
                      <article key={item.id} className="comment-item" onClick={() => focusCommentAnchor(item.id)}>
                        <p>{item.text}</p>
                        {item.quote ? <p className="comment-quote">{item.quote}</p> : null}
                        <div className="comment-meta">
                          <span>{new Date(item.createdAt).toLocaleString("zh-CN", { hour12: false })}</span>
                          <button type="button" onClick={(event) => { event.stopPropagation(); deleteComment(item.id); }}>删除</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </aside>
          </div>
        </section>
      </div>

      {contextMenu ? (
        <div className="folder-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.targetType === "folder" ? (
            <>
              <button type="button" onClick={() => runContextAction(() => createNoteInFolder(contextMenu.folderId))}>新建文件</button>
              <button type="button" onClick={() => runContextAction(() => createChildFolder(contextMenu.folderId))}>新建文件夹</button>
              <button type="button" onClick={() => runContextAction(() => viewDirectoryAction(contextMenu.folderId))}>查看目录</button>
              <hr />
              <button type="button" onClick={() => runContextAction(() => cutFolderAction(contextMenu.folderId))}>剪切</button>
              <button type="button" onClick={() => runContextAction(() => copyFolderAction(contextMenu.folderId))}>复制</button>
              <button type="button" disabled={!canPasteToTarget(contextMenu.folderId)} onClick={() => runContextAction(() => pasteFolderAction(contextMenu.folderId))}>粘贴</button>
              <hr />
              <button type="button" onClick={() => runContextAction(() => renameFolderAction(contextMenu.folderId))}>重命名</button>
              <button type="button" className="danger" onClick={() => runContextAction(() => deleteFolderAction(contextMenu.folderId))}>删除</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => runContextAction(() => contextMenu.noteId && renameNoteById(contextMenu.noteId))}>重命名文件</button>
              <button type="button" className="danger" onClick={() => runContextAction(() => contextMenu.noteId && deleteNoteById(contextMenu.noteId))}>删除文件</button>
            </>
          )}
        </div>
      ) : null}

      {selectionMenu.visible ? (
        <div
          className="selection-floating-toolbar"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className={formatState.block !== "paragraph" ? "active" : ""}
            title="段落与列表"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
              openBlockMenuAt(rect.left, rect.bottom + 8, true);
            }}
          >
            <List size={14} />
          </button>
          <button type="button" className={formatState.bold ? "active" : ""} onClick={() => runCommand("bold")} title="加粗"><Bold size={14} /></button>
          <button type="button" className={formatState.italic ? "active" : ""} onClick={() => runCommand("italic")} title="斜体"><Italic size={14} /></button>
          <button type="button" className={formatState.underline ? "active" : ""} onClick={() => runCommand("underline")} title="下划线"><Underline size={14} /></button>
          <button type="button" className={formatState.align === "left" ? "active" : ""} onClick={() => runCommand("justifyLeft")} title="左对齐"><AlignLeft size={14} /></button>
          <button type="button" className={formatState.align === "center" ? "active" : ""} onClick={() => runCommand("justifyCenter")} title="居中"><AlignCenter size={14} /></button>
          <button type="button" className={formatState.align === "right" ? "active" : ""} onClick={() => runCommand("justifyRight")} title="右对齐"><AlignRight size={14} /></button>
          <button type="button" onClick={() => { runCommand("removeFormat"); runCommand("formatBlock", "<p>"); }} title="清除格式"><RemoveFormatting size={14} /></button>
          <button type="button" onClick={startSelectionCommentInput} title="关联评论"><MessageSquarePlus size={14} /></button>
          <button type="button" onClick={insertLink} title="链接"><Link2 size={14} /></button>
          <button type="button" onClick={insertCode} title="代码"><Code size={14} /></button>
        </div>
      ) : null}

      {selectionContext.visible ? (
        <div
          className="selection-context-menu"
          style={{ left: selectionContext.x, top: selectionContext.y }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className={formatState.block !== "paragraph" ? "active" : ""}
            title="段落与列表"
            onClick={(event) => {
              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
              openBlockMenuAt(rect.left, rect.bottom + 8, true);
              setSelectionContext((prev) => (prev.visible ? { ...prev, visible: false } : prev));
            }}
          >
            <List size={14} />
          </button>
          <button type="button" className={formatState.bold ? "active" : ""} onClick={() => runCommand("bold")} title="加粗"><Bold size={14} /></button>
          <button type="button" className={formatState.italic ? "active" : ""} onClick={() => runCommand("italic")} title="斜体"><Italic size={14} /></button>
          <button type="button" className={formatState.align === "left" ? "active" : ""} onClick={() => runCommand("justifyLeft")} title="左对齐"><AlignLeft size={14} /></button>
          <button type="button" className={formatState.align === "center" ? "active" : ""} onClick={() => runCommand("justifyCenter")} title="居中"><AlignCenter size={14} /></button>
          <button type="button" className={formatState.align === "right" ? "active" : ""} onClick={() => runCommand("justifyRight")} title="右对齐"><AlignRight size={14} /></button>
          <button type="button" onClick={() => { runCommand("removeFormat"); runCommand("formatBlock", "<p>"); }} title="清除格式"><RemoveFormatting size={14} /></button>
          <button type="button" onClick={startSelectionCommentInput} title="关联评论"><MessageSquarePlus size={14} /></button>
          <button type="button" onClick={insertLink} title="链接"><Link2 size={14} /></button>
          <button type="button" onClick={insertCode} title="代码"><Code size={14} /></button>
        </div>
      ) : null}

      {blockMenuOpen ? (
        <div
          className={blockMenuCompact ? "block-format-menu compact" : "block-format-menu"}
          style={{
            left: blockMenuPos.x,
            top: blockMenuPos.y
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className={formatState.block === "paragraph" ? "active" : ""} onClick={() => applyBlockFormat("paragraph")}><span className="format-token">T</span><span>正文</span><span className="check-mark">{formatState.block === "paragraph" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "h1" ? "active" : ""} onClick={() => applyBlockFormat("h1")}><span className="format-token">H1</span><span>一级标题</span><span className="check-mark">{formatState.block === "h1" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "h2" ? "active" : ""} onClick={() => applyBlockFormat("h2")}><span className="format-token">H2</span><span>二级标题</span><span className="check-mark">{formatState.block === "h2" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "h3" ? "active" : ""} onClick={() => applyBlockFormat("h3")}><span className="format-token">H3</span><span>三级标题</span><span className="check-mark">{formatState.block === "h3" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "h4" ? "active" : ""} onClick={() => applyBlockFormat("h4")}><span className="format-token">Hn</span><span>其他标题</span><span className="check-mark">{formatState.block === "h4" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "ordered" ? "active" : ""} onClick={() => applyBlockFormat("ordered")}><ListOrdered size={16} /><span>有序列表</span><span className="check-mark">{formatState.block === "ordered" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "unordered" ? "active" : ""} onClick={() => applyBlockFormat("unordered")}><List size={16} /><span>无序列表</span><span className="check-mark">{formatState.block === "unordered" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "task" ? "active" : ""} onClick={() => applyBlockFormat("task")}><span className="format-token">☑</span><span>任务</span><span className="check-mark">{formatState.block === "task" ? "✓" : ""}</span></button>
          <button type="button" className={formatState.block === "codeblock" ? "active" : ""} onClick={() => applyBlockFormat("codeblock")}><span className="format-token">{`{ }`}</span><span>代码块</span><span className="check-mark">{formatState.block === "codeblock" ? "✓" : ""}</span></button>
        </div>
      ) : null}
    </section>
  );
}


