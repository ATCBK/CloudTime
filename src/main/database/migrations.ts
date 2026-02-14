import Database from 'better-sqlite3'
import { SCHEMA, INDEXES } from './schema'

export function runMigrations(db: Database.Database): void {
  // 创建表
  Object.values(SCHEMA).forEach((sql) => {
    db.exec(sql)
  })

  // 创建索引
  Object.values(INDEXES).forEach((sql) => {
    db.exec(sql)
  })

  // 插入默认设置
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  insertSetting.run('theme', 'light')
  insertSetting.run('quickInputShortcut', 'Ctrl+I')
  insertSetting.run('mainWindowShortcut', 'Alt+Space')

  // 插入默认分类
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, color, icon, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const now = new Date().toISOString()
  insertCategory.run('study', '学习', '#3B82F6', '📚', now, now)
  insertCategory.run('life', '生活', '#10B981', '🏠', now, now)
  insertCategory.run('work', '工作', '#F59E0B', '💼', now, now)
}
