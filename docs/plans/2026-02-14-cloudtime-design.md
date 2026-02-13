# CloudTime 时间管理应用 - 设计文档

**日期**: 2026-02-14
**版本**: 1.0
**状态**: 待审批

## 1. 项目概述

### 1.1 产品定位

CloudTime 是一个个人时间管理工具,结合待办和笔记功能,帮助用户高效管理时间和记录灵感。

### 1.2 核心特性

- 待办任务管理(添加、删除、完成、分类)
- 可视化时间轴(拖拽式时间管理)
- 多视图切换(日/周/月视图)
- 灵感记录(与日期关联的轻量级笔记)
- 传统笔记管理(文件夹层级结构)
- 透明弹窗(快速访问,不抢注意力)
- 全局快捷键(快速输入和窗口唤起)

### 1.3 设计原则

- **极简现代**: 简洁的界面,大量留白,专注于内容
- **不抢注意力**: 柔和的色彩,透明弹窗,快速隐藏
- **高效操作**: 全局快捷键,拖拽交互,快速输入
- **本地优先**: 数据存储在本地,无需网络,启动快速

## 2. 技术方案

### 2.1 技术栈

**前端**:
- React 18 + TypeScript
- Tailwind CSS (样式)
- React DnD (拖拽)
- date-fns (日期处理)
- Zustand (状态管理)

**后端**:
- Electron (桌面框架)
- better-sqlite3 (SQLite 数据库)
- electron-store (配置存储)

**开发工具**:
- Vite (构建工具)
- ESLint + Prettier (代码规范)
- Vitest (单元测试)
- Playwright (E2E 测试)

### 2.2 项目结构

```
CloudTime/
├── src/
│   ├── main/              # 主进程
│   │   ├── index.ts       # 主进程入口
│   │   ├── windows.ts     # 窗口管理
│   │   ├── shortcuts.ts   # 快捷键管理
│   │   ├── tray.ts        # 系统托盘
│   │   └── database/      # 数据库操作
│   │       ├── index.ts
│   │       ├── tasks.ts
│   │       ├── notes.ts
│   │       ├── categories.ts
│   │       └── inspirations.ts
│   ├── renderer/          # 渲染进程
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/  # UI 组件
│   │   │   ├── hooks/       # 自定义 hooks
│   │   │   ├── store/       # Zustand store
│   │   │   ├── types/       # TypeScript 类型
│   │   │   └── utils/       # 工具函数
│   │   └── index.html
│   └── preload/           # 预加载脚本
│       └── index.ts
├── docs/                  # 文档
├── tests/                 # 测试
└── package.json
```

## 3. 数据库设计

### 3.1 表结构

**tasks 表(任务)**
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,      -- 'todo', 'in_progress', 'completed'
  category_id TEXT,          -- 任务分类
  scheduled_date TEXT,       -- ISO 8601 日期 '2026-02-14'
  scheduled_time TEXT,       -- 时间 '09:00'
  duration INTEGER,          -- 持续时间(分钟)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);
```

**categories 表(任务分类)**
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,        -- '学习', '生活', '工作'
  color TEXT NOT NULL,       -- 分类颜色 '#3B82F6'
  icon TEXT,                 -- 可选图标
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**notes 表(笔记)**
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  folder_id TEXT,            -- 所属文件夹 ID
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX idx_notes_folder_id ON notes(folder_id);
```

**folders 表(文件夹)**
```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,            -- 父文件夹 ID,支持嵌套
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX idx_folders_parent_id ON folders(parent_id);
```

**inspirations 表(灵感记录)**
```sql
CREATE TABLE inspirations (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,     -- 灵感内容
  date TEXT NOT NULL,        -- 关联日期 '2026-02-14'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_inspirations_date ON inspirations(date);
```

**settings 表(设置)**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 3.2 TypeScript 类型定义

```typescript
interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'completed'
  categoryId?: string
  scheduledDate?: string  // '2026-02-14'
  scheduledTime?: string  // '09:00'
  duration?: number       // 分钟
  createdAt: string
  updatedAt: string
  completedAt?: string
}

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  createdAt: string
  updatedAt: string
}

interface Note {
  id: string
  title: string
  content?: string
  folderId?: string
  createdAt: string
  updatedAt: string
}

interface Folder {
  id: string
  name: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

interface Inspiration {
  id: string
  content: string
  date: string  // '2026-02-14'
  createdAt: string
  updatedAt: string
}

interface Settings {
  theme: 'light' | 'dark'
  quickInputShortcut: string  // 默认 'Ctrl+I'
  mainWindowShortcut: string  // 默认 'Alt+Space'
}
```

## 4. UI 设计

### 4.1 整体布局

应用采用四层布局结构:

```
┌───────────────────────────────────────────────────────────┐
│  [≡] CloudTime             [日/周/月]  [设置] [主题切换]  │ ← 顶部导航栏
├─┬─┬──────────────────────────────────────────────────┬────┤
│ │ │                                                  │    │
│ │ │              主内容区 - 时间轴                  │    │
│📋│ │                                                  │ 右 │
│ │待│                                                  │ 侧 │
│ │办│                                                  │ 面 │
│📝│列│                                                  │ 板 │
│ │表│                                                  │    │
│ │ │                                                  │    │
│⚙│ │                                                  │    │
│ │ │                                                  │    │
│ │ │                                                  │    │
│ │ │                                                  │    │
│ │ │                                                  │    │
│ │ │                                                  │    │
└─┴─┴──────────────────────────────────────────────────┴────┘
  ↑ ↑                                                    ↑
  │ └─ 左侧内容面板(可展开/折叠,约250-300px)            │
  └─── 图标栏(固定,约40px)                             └─ 右侧面板(约300px)
```

### 4.2 图标栏(最左侧)

固定宽度约 40px,垂直排列三个图标:
- 📋 待办图标
- 📝 笔记图标
- ⚙ 设置图标

点击图标展开对应的左侧内容面板。

### 4.3 左侧内容面板

可展开/折叠,宽度约 250-300px,支持拖拽调整。

**待办面板(点击📋图标)**:
- 按分类显示所有待办任务
- 未安排时间的任务显示在这里
- 可以拖拽任务到时间轴
- 支持快速创建新任务

**笔记面板(点击📝图标)**:
- 文件夹树形结构
- 点击笔记在右侧面板打开编辑器
- 支持创建新笔记和新文件夹

**设置面板(点击⚙图标)**:
- 主题切换(浅色/深色)
- 快捷键设置
- 分类管理
- 其他偏好设置

### 4.4 主内容区(时间轴)

**日视图(默认)**:
- 显示当天的时间轴(24小时,1小时为网格单位)
- 只显示已安排到时间轴的任务
- 任务可以跨时间块(如 1.5 小时)
- 同一时间多任务自动堆叠显示
- 支持拖拽调整任务时间和持续时间
- 保持简洁,不显示未安排的任务

**周视图**:
- 显示本周 7 天的概览
- 每天显示任务数量和简要信息
- 点击某一天切换到该天的日视图

**月视图**:
- 显示本月日历
- 每天显示任务数量(如小圆点或数字)
- 点击某一天切换到该天的日视图

### 4.5 右侧面板(动态切换)

宽度约 300px,支持拖拽调整。

**默认状态(未选中任何内容)**:
- 显示当天的灵感记录列表
- 支持快速添加新灵感
- 支持编辑和删除灵感

**选中任务时**:
- 显示任务详情
- 可编辑任务信息
- 可删除或完成任务

**选中笔记时**:
- 显示笔记编辑器
- 支持 Markdown 格式
- 自动保存

### 4.6 设计规范

**浅色主题**:
- 背景: #FFFFFF
- 次级背景: #F8F9FA
- 边框: #E5E7EB
- 文字主色: #1F2937
- 文字次色: #6B7280
- 主色调(蓝色): #3B82F6
- 主色调悬停: #2563EB

**深色主题**:
- 背景: #1F2937
- 次级背景: #111827
- 边框: #374151
- 文字主色: #F9FAFB
- 文字次色: #9CA3AF
- 主色调(蓝色): #60A5FA
- 主色调悬停: #3B82F6

**字体**:
- 系统默认: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- 中文字体: "Microsoft YaHei", "微软雅黑"

**间距**:
- 遵循 8px 网格系统
- 组件间距: 16px, 24px, 32px

**圆角**:
- 小组件: 4px
- 卡片: 8px
- 弹窗: 12px

## 5. 核心功能

### 5.1 任务管理

**创建任务**:
- 快速输入(Ctrl+I): 支持快捷语法,如 "买菜 #生活 @明天 9:00"
- 左侧待办面板: 点击"+ 新建任务"
- 时间轴双击: 在时间轴上双击某个时间点快速创建

**任务拖拽**:
- 从待办列表拖拽到时间轴: 自动设置时间
- 时间轴内调整: 拖拽改变时间,拖拽边缘改变持续时间
- 从时间轴拖回待办列表: 清除时间,回到待办列表

**任务分类**:
- 支持自定义分类(学习、生活、工作等)
- 每个分类有独立的颜色和图标
- 可以按分类筛选任务

**任务状态**:
- todo: 待办
- in_progress: 进行中
- completed: 已完成

### 5.2 时间轴管理

**时间网格**:
- 1 小时为基础网格单位
- 任务可以跨时间块(如 1.5 小时、2.5 小时)
- 同一时间多任务自动堆叠显示

**拖拽交互**:
- 支持从待办列表拖拽任务到时间轴
- 支持在时间轴内拖拽调整时间
- 支持拖拽边缘调整任务持续时间
- 支持拖拽回待办列表

**视图切换**:
- 日视图: 显示当天的 24 小时时间轴
- 周视图: 显示本周 7 天的概览,点击某天切换到日视图
- 月视图: 显示本月日历,点击某天切换到日视图

### 5.3 灵感记录

**特性**:
- 与日期关联的轻量级笔记
- 显示在右侧面板(默认状态)
- 不占用时间轴
- 支持快速创建和编辑

**创建方式**:
- 右侧面板点击"+ 添加灵感"
- 快速输入: "/i 今天的想法"

**查看方式**:
- 切换到某一天的日视图,右侧面板自动显示该天的灵感记录

### 5.4 笔记管理

**特性**:
- 文件夹层级结构
- 支持 Markdown 格式
- 独立于灵感记录,用于长期知识管理

**创建方式**:
- 左侧笔记面板点击"+ 新建笔记"
- 快速输入: "/n 会议记录"

**编辑方式**:
- 点击笔记,在右侧面板打开编辑器
- 自动保存

### 5.5 快捷键

**全局快捷键**:
- Alt+Space: 唤起/隐藏主窗口
- Ctrl+I: 唤起快速输入窗口(可自定义)

**应用内快捷键**:
- Ctrl+N: 新建任务
- Ctrl+Shift+N: 新建笔记
- Ctrl+/: 快速输入
- Ctrl+1/2/3: 切换日/周/月视图
- Ctrl+,: 打开设置

### 5.6 系统托盘

**功能**:
- 显示今天待完成任务数量
- 右键菜单:
  - 显示主窗口
  - 快速输入
  - 退出

## 6. 技术实现

### 6.1 状态管理(Zustand)

```typescript
// store/taskStore.ts
interface TaskStore {
  tasks: Task[]
  categories: Category[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  getTasksByDate: (date: string) => Task[]
  getUnscheduledTasks: () => Task[]
}

// store/noteStore.ts
interface NoteStore {
  notes: Note[]
  folders: Folder[]
  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
}

// store/inspirationStore.ts
interface InspirationStore {
  inspirations: Inspiration[]
  addInspiration: (inspiration: Inspiration) => void
  getInspirationsByDate: (date: string) => Inspiration[]
}

// store/uiStore.ts
interface UIStore {
  currentView: 'day' | 'week' | 'month'
  currentDate: string
  leftPanelOpen: boolean
  leftPanelContent: 'todo' | 'note' | 'settings' | null
  rightPanelContent: 'inspiration' | 'taskDetail' | 'noteEditor'
  theme: 'light' | 'dark'
}
```

### 6.2 IPC 通信

```typescript
// preload/index.ts
const api = {
  // 任务操作
  getTasks: () => ipcRenderer.invoke('tasks:getAll'),
  createTask: (task: any) => ipcRenderer.invoke('tasks:create', task),
  updateTask: (id: string, updates: any) => ipcRenderer.invoke('tasks:update', id, updates),
  deleteTask: (id: string) => ipcRenderer.invoke('tasks:delete', id),

  // 分类操作
  getCategories: () => ipcRenderer.invoke('categories:getAll'),
  createCategory: (category: any) => ipcRenderer.invoke('categories:create', category),

  // 笔记操作
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  createNote: (note: any) => ipcRenderer.invoke('notes:create', note),
  updateNote: (id: string, updates: any) => ipcRenderer.invoke('notes:update', id, updates),

  // 灵感记录操作
  getInspirations: (date: string) => ipcRenderer.invoke('inspirations:getByDate', date),
  createInspiration: (inspiration: any) => ipcRenderer.invoke('inspirations:create', inspiration),

  // 设置操作
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSetting: (key: string, value: any) => ipcRenderer.invoke('settings:update', key, value),
}

contextBridge.exposeInMainWorld('api', api)
```

### 6.3 拖拽实现(React DnD)

```typescript
// 任务卡片可拖拽
const [{ isDragging }, drag] = useDrag({
  type: 'TASK',
  item: { id: task.id, type: 'TASK' },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
})

// 时间轴时间槽可放置
const [{ isOver }, drop] = useDrop({
  accept: 'TASK',
  drop: (item: { id: string }, monitor) => {
    const offset = monitor.getClientOffset()
    const time = calculateTimeFromOffset(offset)
    updateTaskTime(item.id, time)
  },
  collect: (monitor) => ({
    isOver: monitor.isOver(),
  }),
})
```

## 7. 测试策略

### 7.1 单元测试(Vitest)

- 工具函数测试(日期处理、ID 生成等)
- Store 测试(状态管理逻辑)
- 数据库操作测试

### 7.2 集成测试

- IPC 通信测试
- 数据库 CRUD 操作测试
- 快捷键注册测试

### 7.3 E2E 测试(Playwright)

- 创建任务流程
- 拖拽任务到时间轴
- 视图切换
- 灵感记录创建
- 笔记管理

### 7.4 测试覆盖率

- 目标: 80% 以上
- 关键路径: 100% 覆盖

## 8. 错误处理

### 8.1 数据库错误

- 捕获所有数据库操作异常
- 记录错误日志
- 向用户显示友好的错误提示

### 8.2 IPC 通信错误

- 超时处理
- 重试机制
- 降级方案

### 8.3 用户输入错误

- 输入验证
- 友好的错误提示
- 防止无效数据进入数据库

## 9. 性能优化

### 9.1 渲染优化

- React.memo 避免不必要的重渲染
- 虚拟滚动(如果任务列表很长)
- 防抖和节流(搜索、拖拽等)

### 9.2 数据库优化

- 索引优化
- 批量操作
- 连接池管理

### 9.3 启动优化

- 延迟加载非关键模块
- 预加载常用数据
- 优化打包体积

## 10. 安全性

### 10.1 数据安全

- 本地数据加密(可选)
- 定期备份
- 防止 SQL 注入(使用参数化查询)

### 10.2 输入验证

- 所有用户输入都需要验证
- 防止 XSS 攻击
- 文件路径验证

## 11. 未来扩展

### 11.1 可选功能

- 云端同步(可选开启)
- 数据导出(JSON、CSV)
- 主题自定义
- 插件系统

### 11.2 性能监控

- 应用性能监控
- 错误追踪
- 用户行为分析(可选,需用户同意)

## 12. 开发计划

### 12.1 阶段划分

**阶段 1: 基础架构(1-2 周)**
- Electron 项目搭建
- 数据库设计和实现
- IPC 通信框架
- 基础 UI 框架

**阶段 2: 核心功能(2-3 周)**
- 任务管理
- 时间轴视图
- 拖拽功能
- 视图切换

**阶段 3: 扩展功能(1-2 周)**
- 灵感记录
- 笔记管理
- 快捷键
- 系统托盘

**阶段 4: 优化和测试(1 周)**
- 性能优化
- 测试覆盖
- Bug 修复
- 文档完善

### 12.2 里程碑

- M1: 基础架构完成,可以创建和显示任务
- M2: 时间轴拖拽功能完成
- M3: 所有核心功能完成
- M4: 测试通过,可以发布 Beta 版本

## 13. 风险评估

### 13.1 技术风险

- **拖拽性能**: 大量任务时拖拽可能卡顿
  - 缓解: 虚拟滚动、性能优化
- **数据库性能**: 数据量大时查询可能变慢
  - 缓解: 索引优化、分页加载

### 13.2 用户体验风险

- **学习曲线**: 用户可能不熟悉拖拽操作
  - 缓解: 提供引导教程、快捷键提示
- **数据丢失**: 用户可能误删数据
  - 缓解: 回收站功能、定期备份

## 14. 总结

CloudTime 是一个功能完善的个人时间管理工具,采用 Electron + React + TypeScript 技术栈,提供直观的拖拽式时间管理体验。设计遵循极简现代风格,注重用户体验和性能优化。

通过本设计文档,开发团队可以清晰地了解产品需求、技术方案和实现细节,为后续的开发工作提供指导。
