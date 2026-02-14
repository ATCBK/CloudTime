import { create } from 'zustand'
import { Task } from '../../../shared/types'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  error: string | null

  // Actions
  fetchTasks: () => Promise<void>
  fetchTasksByDate: (date: string) => Promise<void>
  fetchUnscheduledTasks: () => Promise<void>
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await window.api.tasks.getAll()
      set({ tasks, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchTasksByDate: async (date: string) => {
    set({ loading: true, error: null })
    try {
      const tasks = await window.api.tasks.getByDate(date)
      set({ tasks, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchUnscheduledTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await window.api.tasks.getUnscheduled()
      set({ tasks, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createTask: async (task) => {
    set({ loading: true, error: null })
    try {
      const newTask = await window.api.tasks.create(task)
      set((state) => ({
        tasks: [...state.tasks, newTask],
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      await window.api.tasks.update(id, updates)
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null })
    try {
      await window.api.tasks.delete(id)
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },
}))
