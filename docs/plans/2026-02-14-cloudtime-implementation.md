# CloudTime 时间管理应用 - 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**: 构建一个基于 Electron + React + TypeScript 的个人时间管理桌面应用,支持待办管理、时间轴拖拽、灵感记录和笔记管理。

**架构**: 采用 Electron 双进程架构,主进程负责窗口管理、数据库操作和系统集成,渲染进程使用 React 构建 UI。数据存储使用 SQLite,状态管理使用 Zustand,拖拽功能使用 React DnD。

**技术栈**: Electron, React 18, TypeScript, Tailwind CSS, SQLite (better-sqlite3), Zustand, React DnD, date-fns, Vite

---

## 阶段 1: 项目基础架构

### Task 1.1: 初始化 Electron + React + TypeScript 项目

**文件**:
- 创建: `package.json`
- 创建: `vite.config.ts`
- 创建: `tsconfig.json`
- 创建: `tsconfig.node.json`
- 创建: `.gitignore`
- 创建: `.eslintrc.json`
- 创建: `.prettierrc`

**步骤 1: 初始化项目并安装依赖**

```bash
npm init -y
npm install --save-dev electron electron-builder vite @vitejs/plugin-react typescript
npm install --save-dev @types/node @types/react @types/react-dom
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
npm install react react-dom
```

**步骤 2: 配置 package.json**

修改 `package.json`:
```json
{
  "name": "cloudtime",
  "version": "0.1.0",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\""
  }
}
```

**步骤 3: 配置 TypeScript**

创建 `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/renderer"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**步骤 4: 配置 Vite**

创建 `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
    },
  },
})
```

**步骤 5: 配置 ESLint 和 Prettier**

创建 `.eslintrc.json`:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

创建 `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**步骤 6: 创建 .gitignore**

```
node_modules/
dist/
dist-electron/
.vite/
*.log
.DS_Store
.env
```

**步骤 7: 提交**

```bash
git add .
git commit -m "chore: 初始化 Electron + React + TypeScript 项目

- 配置 Vite 构建工具
- 配置 TypeScript 编译选项
- 配置 ESLint 和 Prettier
- 添加基础依赖

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.2: 创建 Electron 主进程基础结构

**文件**:
- 创建: `src/main/index.ts`
- 创建: `src/main/windows.ts`
- 创建: `src/preload/index.ts`

**步骤 1: 编写主进程入口文件**

创建 `src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { createMainWindow } from './windows'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
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
```

**步骤 2: 编写窗口管理模块**

创建 `src/main/windows.ts`:
```typescript
import { BrowserWindow } from 'electron'
import path from 'path'

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
```

**步骤 3: 编写预加载脚本**

创建 `src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 占位符,后续添加 IPC 方法
  ping: () => ipcRenderer.invoke('ping'),
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
```

**步骤 4: 提交**

```bash
git add src/main src/preload
git commit -m "feat: 创建 Electron 主进程基础结构

- 实现主进程入口和窗口管理
- 配置预加载脚本和上下文隔离
- 支持开发模式和生产模式

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 1.3: 创建 React 渲染进程基础结构

**文件**:
- 创建: `src/renderer/index.html`
- 创建: `src/renderer/src/main.tsx`
- 创建: `src/renderer/src/App.tsx`
- 创建: `src/renderer/src/vite-env.d.ts`

**步骤 1: 创建 HTML 入口文件**

创建 `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CloudTime</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**步骤 2: 创建 React 入口文件**

创建 `src/renderer/src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**步骤 3: 创建 App 组件**

创建 `src/renderer/src/App.tsx`:
```typescript
import React from 'react'

function App() {
  return (
    <div className="h-screen w-screen bg-white dark:bg-gray-900">
      <div className="flex h-full items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          CloudTime
        </h1>
      </div>
    </div>
  )
}

export default App
```

**步骤 4: 创建类型声明文件**

创建 `src/renderer/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

import type { API } from '../../preload/index'

declare global {
  interface Window {
    api: API
  }
}
```

**步骤 5: 安装 Tailwind CSS**

```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**步骤 6: 配置 Tailwind CSS**

修改 `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

创建 `src/renderer/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**步骤 7: 提交**

```bash
git add src/renderer tailwind.config.js postcss.config.js
git commit -m "feat: 创建 React 渲染进程基础结构

- 实现 React 应用入口
- 配置 Tailwind CSS
- 创建基础 App 组件

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 阶段 2: 数据库层实现

### Task 2.1: 设置 SQLite 数据库

**文件**:
- 创建: `src/main/database/index.ts`
- 创建: `src/main/database/schema.ts`
- 创建: `src/main/database/migrations.ts`

**步骤 1: 安装 better-sqlite3**

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**步骤 2: 编写数据库初始化代码**

创建 `src/main/database/index.ts`:
```typescript
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
```

**步骤 3: 编写数据库 schema**

创建 `src/main/database/schema.ts`:
```typescript
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
```

**步骤 4: 编写迁移脚本**

创建 `src/main/database/migrations.ts`:
```typescript
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
```

**步骤 5: 在主进程中初始化数据库**

修改 `src/main/index.ts`,添加数据库初始化:
```typescript
import { initDatabase, closeDatabase } from './database'

app.whenReady().then(() => {
  initDatabase()
  mainWindow = createMainWindow()
  // ...
})

app.on('before-quit', () => {
  closeDatabase()
})
```

**步骤 6: 提交**

```bash
git add src/main/database
git commit -m "feat: 实现 SQLite 数据库层

- 创建数据库初始化和迁移系统
- 定义所有表结构和索引
- 插入默认设置和分类数据

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: 实现任务数据库操作

**文件**:
- 创建: `src/main/database/tasks.ts`
- 创建: `src/shared/types.ts`

**步骤 1: 创建共享类型定义**

创建 `src/shared/types.ts`:
```typescript
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
```

**步骤 2: 实现任务数据库操作**

创建 `src/main/database/tasks.ts`:
```typescript
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
```

**步骤 3: 安装 nanoid**

```bash
npm install nanoid
```

**步骤 4: 提交**

```bash
git add src/main/database/tasks.ts src/shared/types.ts
git commit -m "feat: 实现任务数据库操作

- 创建 TaskDatabase 类
- 实现 CRUD 操作
- 添加按日期查询和未安排任务查询
- 定义共享类型

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 后续阶段概览

由于完整的实现计划非常详细,以下是剩余阶段的概览:

### 阶段 3: IPC 通信层
- Task 3.1: 实现任务相关 IPC 处理器
- Task 3.2: 实现笔记和文件夹 IPC 处理器
- Task 3.3: 实现灵感记录 IPC 处理器
- Task 3.4: 实现设置 IPC 处理器

### 阶段 4: 状态管理(Zustand)
- Task 4.1: 创建任务 Store
- Task 4.2: 创建笔记 Store
- Task 4.3: 创建灵感记录 Store
- Task 4.4: 创建 UI Store

### 阶段 5: UI 组件 - 布局框架
- Task 5.1: 实现顶部导航栏
- Task 5.2: 实现图标栏(最左侧)
- Task 5.3: 实现左侧内容面板(可折叠)
- Task 5.4: 实现右侧面板(动态切换)

### 阶段 6: UI 组件 - 时间轴视图
- Task 6.1: 实现日视图时间轴网格
- Task 6.2: 实现任务卡片组件
- Task 6.3: 实现拖拽功能(React DnD)
- Task 6.4: 实现同一时间多任务堆叠
- Task 6.5: 实现周视图
- Task 6.6: 实现月视图

### 阶段 7: UI 组件 - 待办管理
- Task 7.1: 实现待办列表面板
- Task 7.2: 实现任务分类管理
- Task 7.3: 实现任务创建和编辑
- Task 7.4: 实现任务详情面板

### 阶段 8: UI 组件 - 笔记管理
- Task 8.1: 实现笔记树形列表
- Task 8.2: 实现笔记编辑器(Markdown)
- Task 8.3: 实现文件夹管理

### 阶段 9: UI 组件 - 灵感记录
- Task 9.1: 实现灵感记录列表
- Task 9.2: 实现灵感快速创建
- Task 9.3: 实现灵感编辑和删除

### 阶段 10: 快捷键和系统集成
- Task 10.1: 实现全局快捷键(Alt+Space, Ctrl+I)
- Task 10.2: 实现快速输入窗口
- Task 10.3: 实现系统托盘
- Task 10.4: 实现快捷语法解析

### 阶段 11: 主题和设置
- Task 11.1: 实现主题切换(浅色/深色)
- Task 11.2: 实现设置面板
- Task 11.3: 实现快捷键自定义

### 阶段 12: 测试
- Task 12.1: 编写单元测试(Vitest)
- Task 12.2: 编写集成测试
- Task 12.3: 编写 E2E 测试(Playwright)
- Task 12.4: 达到 80% 测试覆盖率

### 阶段 13: 优化和打包
- Task 13.1: 性能优化
- Task 13.2: 错误处理完善
- Task 13.3: 配置 electron-builder
- Task 13.4: 构建 Windows 安装包

---

## 执行建议

### 开发顺序
1. **先纵向**: 完成一个完整的功能流(如任务创建 → 数据库 → IPC → UI → 测试)
2. **后横向**: 扩展到其他功能(笔记、灵感记录等)
3. **持续集成**: 每完成一个 Task 就提交,保持小步快跑

### TDD 原则
- 每个功能都先写测试
- 测试驱动开发,确保代码质量
- 目标: 80% 以上测试覆盖率

### 代码规范
- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 严格模式
- 保持文件小于 800 行
- 遵循不可变性原则

---

## 执行方式选择

计划已完成并保存到 `docs/plans/2026-02-14-cloudtime-implementation.md`。

**两种执行方式:**

**1. Subagent-Driven (当前会话)**
- 我在当前会话中为每个任务派发新的子代理
- 任务间进行代码审查
- 快速迭代,实时反馈

**2. Parallel Session (独立会话)**
- 在新会话中使用 executing-plans 技能
- 批量执行,设置检查点
- 适合长时间运行

你选择哪种方式?
