import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { InspirationDatabase } from '../database/inspirations'
import { Inspiration } from '../../shared/types'

export function registerInspirationHandlers(): void {
  const db = getDatabase()
  const inspirationDb = new InspirationDatabase(db)

  ipcMain.handle('inspirations:getByDate', async (_event, date: string) => {
    try {
      return inspirationDb.getByDate(date)
    } catch (error) {
      console.error('Failed to get inspirations by date:', error)
      throw error
    }
  })

  ipcMain.handle('inspirations:create', async (_event, inspiration: Omit<Inspiration, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      return inspirationDb.create(inspiration)
    } catch (error) {
      console.error('Failed to create inspiration:', error)
      throw error
    }
  })

  ipcMain.handle('inspirations:update', async (_event, id: string, content: string) => {
    try {
      inspirationDb.update(id, content)
      return { success: true }
    } catch (error) {
      console.error('Failed to update inspiration:', error)
      throw error
    }
  })

  ipcMain.handle('inspirations:delete', async (_event, id: string) => {
    try {
      inspirationDb.delete(id)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete inspiration:', error)
      throw error
    }
  })
}
