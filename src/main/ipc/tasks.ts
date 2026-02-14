import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { TaskDatabase } from '../database/tasks'
import { Task } from '../../shared/types'

export function registerTaskHandlers(): void {
  const db = getDatabase()
  const taskDb = new TaskDatabase(db)

  // 获取所有任务
  ipcMain.handle('tasks:getAll', async () => {
    try {
      return taskDb.getAllTasks()
    } catch (error) {
      console.error('Failed to get all tasks:', error)
      throw error
    }
  })

  // 按日期获取任务
  ipcMain.handle('tasks:getByDate', async (_event, date: string) => {
    try {
      return taskDb.getTasksByDate(date)
    } catch (error) {
      console.error('Failed to get tasks by date:', error)
      throw error
    }
  })

  // 获取未安排的任务
  ipcMain.handle('tasks:getUnscheduled', async () => {
    try {
      return taskDb.getUnscheduledTasks()
    } catch (error) {
      console.error('Failed to get unscheduled tasks:', error)
      throw error
    }
  })

  // 创建任务
  ipcMain.handle('tasks:create', async (_event, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      return taskDb.createTask(task)
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error
    }
  })

  // 更新任务
  ipcMain.handle('tasks:update', async (_event, id: string, updates: Partial<Task>) => {
    try {
      taskDb.updateTask(id, updates)
      return { success: true }
    } catch (error) {
      console.error('Failed to update task:', error)
      throw error
    }
  })

  // 删除任务
  ipcMain.handle('tasks:delete', async (_event, id: string) => {
    try {
      taskDb.deleteTask(id)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete task:', error)
      throw error
    }
  })
}
