/// <reference types="vite/client" />

interface QuickPanelItem {
  scheduleId: string;
  todoId: string;
  title: string;
  project: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  completed: boolean;
  details: string;
}

interface DynamicHotkeys {
  toggleQuickPanel: string;
  quickCreateTodo: string;
}

interface DiskMarkdownNote {
  relativeDir: string;
  fileName: string;
  content: string;
  updatedAt: number;
}

interface NoteComment {
  id: string;
  text: string;
  createdAt: number;
  quote?: string;
}

interface NotesFileSnapshot {
  folders: unknown[];
  notes: unknown[];
  selectedFolderId: string;
  currentNoteId: string;
  expandedIds: string[];
  commentsByNote: Record<string, NoteComment[]>;
  savedAt: number;
}

declare global {
  interface Window {
    cloudo: {
      setWindowOpacity: (value: number) => Promise<void>;
      toggleWindow: () => Promise<void>;
      toggleQuickPanelWindow: () => Promise<void>;
      setQuickPanelOpacity: (value: number) => Promise<void>;
      updateQuickPanelState: (items: QuickPanelItem[]) => Promise<void>;
      toggleQuickPanelTask: (todoId: string) => Promise<void>;
      getDynamicHotkeys: () => Promise<DynamicHotkeys>;
      setDynamicHotkeys: (payload: DynamicHotkeys) => Promise<{ ok: boolean; message?: string }>;
      getStorageBaseDir: () => Promise<string>;
      listDiskMarkdownNotes: () => Promise<DiskMarkdownNote[]>;
      loadNotesSnapshot: () => Promise<NotesFileSnapshot | null>;
      saveNotesSnapshot: (payload: NotesFileSnapshot & { diskEntries: DiskMarkdownNote[] }) => Promise<{ ok: boolean; savedCount: number }>;
      onQuickPanelState: (handler: (items: QuickPanelItem[]) => void) => () => void;
      onQuickPanelToggleTask: (handler: (todoId: string) => void) => () => void;
      onQuickCreateFocus: (handler: () => void) => () => void;
    };
  }
}

export {};
