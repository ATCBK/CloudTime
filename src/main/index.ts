import { app, BrowserWindow } from 'electron'
import path from 'path'
import { createMainWindow } from './windows'
import { initDatabase, closeDatabase } from './database'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
