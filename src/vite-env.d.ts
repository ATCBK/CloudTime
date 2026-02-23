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
      onQuickPanelState: (handler: (items: QuickPanelItem[]) => void) => () => void;
      onQuickPanelToggleTask: (handler: (todoId: string) => void) => () => void;
      onQuickCreateFocus: (handler: () => void) => () => void;
    };
  }
}

export {};
