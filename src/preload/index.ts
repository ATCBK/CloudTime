import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 占位符,后续添加 IPC 方法
  ping: () => ipcRenderer.invoke('ping'),
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
