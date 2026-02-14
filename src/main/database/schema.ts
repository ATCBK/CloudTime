export const SCHEMA = {
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  tasks: `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      category_id TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      duration INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `,
  notes: `
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      folder_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    )
  `,
  folders: `
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    )
  `,
  inspirations: `
    CREATE TABLE IF NOT EXISTS inspirations (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  settings: `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `,
}

export const INDEXES = {
  tasks_scheduled_date: 'CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date)',
  tasks_status: 'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
  tasks_category_id: 'CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id)',
  notes_folder_id: 'CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)',
  folders_parent_id: 'CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)',
  inspirations_date: 'CREATE INDEX IF NOT EXISTS idx_inspirations_date ON inspirations(date)',
}
