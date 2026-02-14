import { create } from 'zustand'
import { Inspiration } from '../../../shared/types'

interface InspirationStore {
  inspirations: Inspiration[]
  loading: boolean
  error: string | null

  fetchByDate: (date: string) => Promise<void>
  create: (content: string, date: string) => Promise<void>
  update: (id: string, content: string) => Promise<void>
  delete: (id: string) => Promise<void>
}

export const useInspirationStore = create<InspirationStore>((set) => ({
  inspirations: [],
  loading: false,
  error: null,

  fetchByDate: async (date: string) => {
    set({ loading: true, error: null })
    try {
      const inspirations = await window.api.inspirations.getByDate(date)
      set({ inspirations, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  create: async (content: string, date: string) => {
    set({ loading: true, error: null })
    try {
      const newInspiration = await window.api.inspirations.create({ content, date })
      set((state) => ({
        inspirations: [newInspiration, ...state.inspirations],
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  update: async (id: string, content: string) => {
    set({ loading: true, error: null })
    try {
      await window.api.inspirations.update(id, content)
      set((state) => ({
        inspirations: state.inspirations.map((insp) =>
          insp.id === id ? { ...insp, content } : insp
        ),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  delete: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await window.api.inspirations.delete(id)
      set((state) => ({
        inspirations: state.inspirations.filter((insp) => insp.id !== id),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },
}))
