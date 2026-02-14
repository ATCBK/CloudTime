export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'completed'
  categoryId?: string
  scheduledDate?: string
  scheduledTime?: string
  duration?: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content?: string
  folderId?: string
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  name: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface Inspiration {
  id: string
  content: string
  date: string
  createdAt: string
  updatedAt: string
}
