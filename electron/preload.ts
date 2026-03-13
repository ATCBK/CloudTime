import { contextBridge, ipcRenderer } from "electron";

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

const api = {
  setWindowOpacity: (value: number) => ipcRenderer.invoke("window:setOpacity", value),
  toggleWindow: () => ipcRenderer.invoke("window:toggle"),
  toggleQuickPanelWindow: () => ipcRenderer.invoke("window:toggleQuickPanel"),
  setQuickPanelOpacity: (value: number) => ipcRenderer.invoke("quickPanel:setOpacity", value),
  updateQuickPanelState: (items: QuickPanelItem[]) => ipcRenderer.invoke("quickPanel:updateState", items),
  toggleQuickPanelTask: (todoId: string) => ipcRenderer.invoke("quickPanel:toggleTask", todoId),
  getDynamicHotkeys: (): Promise<DynamicHotkeys> => ipcRenderer.invoke("hotkeys:getDynamic"),
  setDynamicHotkeys: (payload: DynamicHotkeys): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke("hotkeys:setDynamic", payload),
  getStorageBaseDir: (): Promise<string> => ipcRenderer.invoke("storage:getBaseDir"),
  listDiskMarkdownNotes: (): Promise<DiskMarkdownNote[]> => ipcRenderer.invoke("notes:listDiskMarkdown"),
  onQuickPanelState: (handler: (items: QuickPanelItem[]) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, items: QuickPanelItem[]): void => handler(items);
    ipcRenderer.on("quick-panel:state", wrapped);
    return () => ipcRenderer.removeListener("quick-panel:state", wrapped);
  },
  onQuickPanelToggleTask: (handler: (todoId: string) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, todoId: string): void => handler(todoId);
    ipcRenderer.on("quick-panel:toggle-task", wrapped);
    return () => ipcRenderer.removeListener("quick-panel:toggle-task", wrapped);
  },
  onQuickCreateFocus: (handler: () => void): (() => void) => {
    const wrapped = (): void => handler();
    ipcRenderer.on("quick-create:focus", wrapped);
    return () => ipcRenderer.removeListener("quick-create:focus", wrapped);
  }
};

contextBridge.exposeInMainWorld("cloudo", api);
