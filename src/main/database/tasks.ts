import Database from 'better-sqlite3'
import { Task } from '../../shared/types'
import { nanoid } from 'nanoid'

export class TaskDatabase {
  constructor(private db: Database.Database) {}

  getAllTasks(): Task[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
    return rows.map(this.mapRowToTask)
  }

  getTasksByDate(date: string): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY scheduled_time')
      .all(date)
    return rows.map(this.mapRowToTask)
  }

  getUnscheduledTasks(): Task[] {
    const rows = this.db
      .prepare('SELECT * FROM tasks WHERE scheduled_date IS NULL AND status != ? ORDER BY created_at DESC')
      .all('completed')
    return rows.map(this.mapRowToTask)
  }

  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO tasks (id, title, description, status, category_id, scheduled_date, scheduled_time, duration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        task.title,
        task.description || null,
        task.status,
        task.categoryId || null,
        task.scheduledDate || null,
        task.scheduledTime || null,
        task.duration || null,
        now,
        now
      )

    return { ...task, id, createdAt: now, updatedAt: now }
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        const snakeKey = this.camelToSnake(key)
        fields.push(`${snakeKey} = ?`)
        values.push(value === undefined ? null : value)
      }
    })

    fields.push('updated_at = ?')
    values.push(now, id)

    this.db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  deleteTask(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      categoryId: row.category_id,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      duration: row.duration,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }
}
