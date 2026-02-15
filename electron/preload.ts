import { contextBridge, ipcRenderer } from "electron";

const api = {
  setWindowOpacity: (value: number) => ipcRenderer.invoke("window:setOpacity", value),
  toggleWindow: () => ipcRenderer.invoke("window:toggle"),
  getStorageBaseDir: (): Promise<string> => ipcRenderer.invoke("storage:getBaseDir")
};

contextBridge.exposeInMainWorld("cloudo", api);
