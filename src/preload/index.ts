import { contextBridge, ipcRenderer } from 'electron'
import type { Task } from '../shared/types'

const api = {
  // 任务操作
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getByDate: (date: string) => ipcRenderer.invoke('tasks:getByDate', date),
    getUnscheduled: () => ipcRenderer.invoke('tasks:getUnscheduled'),
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('tasks:create', task),
    update: (id: string, updates: Partial<Task>) => ipcRenderer.invoke('tasks:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
