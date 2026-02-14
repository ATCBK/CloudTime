import Database from 'better-sqlite3'
import { Inspiration } from '../../shared/types'
import { nanoid } from 'nanoid'

export class InspirationDatabase {
  constructor(private db: Database.Database) {}

  getByDate(date: string): Inspiration[] {
    const rows = this.db
      .prepare('SELECT * FROM inspirations WHERE date = ? ORDER BY created_at DESC')
      .all(date)
    return rows.map(this.mapRowToInspiration)
  }

  create(inspiration: Omit<Inspiration, 'id' | 'createdAt' | 'updatedAt'>): Inspiration {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO inspirations (id, content, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, inspiration.content, inspiration.date, now, now)

    return { ...inspiration, id, createdAt: now, updatedAt: now }
  }

  update(id: string, content: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE inspirations SET content = ?, updated_at = ? WHERE id = ?')
      .run(content, now, id)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM inspirations WHERE id = ?').run(id)
  }

  private mapRowToInspiration(row: any): Inspiration {
    return {
      id: row.id,
      content: row.content,
      date: row.date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
