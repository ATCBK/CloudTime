import { create } from 'zustand'
import { format } from 'date-fns'

type ViewType = 'day' | 'week' | 'month'
type LeftPanelContent = 'todo' | 'note' | 'settings' | null
type RightPanelContent = 'inspiration' | 'taskDetail' | 'noteEditor'

interface UIStore {
  // 当前视图
  currentView: ViewType
  currentDate: string

  // 面板状态
  leftPanelOpen: boolean
  leftPanelContent: LeftPanelContent
  rightPanelContent: RightPanelContent

  // 主题
  theme: 'light' | 'dark'

  // 选中的项目
  selectedTaskId: string | null
  selectedNoteId: string | null

  // Actions
  setCurrentView: (view: ViewType) => void
  setCurrentDate: (date: string) => void
  setLeftPanelOpen: (open: boolean) => void
  setLeftPanelContent: (content: LeftPanelContent) => void
  setRightPanelContent: (content: RightPanelContent) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedTaskId: (id: string | null) => void
  setSelectedNoteId: (id: string | null) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'day',
  currentDate: format(new Date(), 'yyyy-MM-dd'),
  leftPanelOpen: true,
  leftPanelContent: 'todo',
  rightPanelContent: 'inspiration',
  theme: 'light',
  selectedTaskId: null,
  selectedNoteId: null,

  setCurrentView: (view) => set({ currentView: view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setLeftPanelContent: (content) => set({ leftPanelContent: content }),
  setRightPanelContent: (content) => set({ rightPanelContent: content }),
  setTheme: (theme) => set({ theme }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
}))
