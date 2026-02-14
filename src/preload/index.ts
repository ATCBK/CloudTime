import { contextBridge, ipcRenderer } from 'electron'
import type { Task, Inspiration } from '../shared/types'

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
  // 灵感记录操作
  inspirations: {
    getByDate: (date: string) => ipcRenderer.invoke('inspirations:getByDate', date),
    create: (inspiration: Omit<Inspiration, 'id' | 'createdAt' | 'updatedAt'>) => ipcRenderer.invoke('inspirations:create', inspiration),
    update: (id: string, content: string) => ipcRenderer.invoke('inspirations:update', id, content),
    delete: (id: string) => ipcRenderer.invoke('inspirations:delete', id),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
