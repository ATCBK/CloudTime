# CloudTime / Cloudo

[中文](#中文) | [English](#english)

---

## 中文

CloudTime（Cloudo）是一个 Windows 桌面时间管理 + 笔记应用，使用 Electron + React + TypeScript 构建。

### 功能概览

- 时间管理模块
  - 待办创建与管理
  - 时间轴拖拽排期
  - 周视图 / 月视图
- 笔记模块
  - 项目文件夹与 Markdown 文件管理
  - 所见即所得编辑（WYSIWYG）
  - 目录树（按标题生成）与评论区
- 界面与交互
  - 三栏布局（文件树 / 正文 / 辅助面板）
  - 折叠与展开面板
  - 轻量白色系 UI

### 技术栈

- Electron
- React 18
- TypeScript
- Vite

### 本地启动

```bash
npm install
npm run dev
```

### 构建

```bash
npm run build
```

### 目录结构

```text
electron/
  main.ts
  preload.ts
src/
  components/
  hooks/
  App.tsx
  styles.css
etc/
```

---

## English

CloudTime (Cloudo) is a Windows desktop app for time management and notes, built with Electron + React + TypeScript.

### Features

- Time Management
  - Todo creation and management
  - Drag-and-drop timeline scheduling
  - Week / Month views
- Notes
  - Project-folder style Markdown management
  - WYSIWYG editing
  - Heading-based table of contents and comments panel
- UI / Interaction
  - Three-column layout (file tree / editor / side panels)
  - Collapsible panels
  - Minimal light theme

### Tech Stack

- Electron
- React 18
- TypeScript
- Vite

### Run Locally

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Project Structure

```text
electron/
  main.ts
  preload.ts
src/
  components/
  hooks/
  App.tsx
  styles.css
etc/
```
