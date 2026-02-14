import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { runMigrations } from './migrations'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'cloudtime.db')
  db = new Database(dbPath)

  // 启用外键约束
  db.pragma('foreign_keys = ON')

  // 运行迁移
  runMigrations(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
