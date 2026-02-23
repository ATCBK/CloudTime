# Time Manager Light Note WYSIWYG Design

Date: 2026-02-22

## Goal
在时间管理页右侧轻笔记区域实现轻量所见即所得编辑器（加粗/斜体/列表/链接），保持现有蓝灰清新风格，并保留编辑/预览心智。

## Scope
- 仅改 `TimeManagerPage` 右栏轻笔记。
- 不引入文件树、评论、复杂目录与跨页复用。
- 新增本地存储键：`cloudo.time.lightNoteHtml`。

## UX
- 顶部工具栏：B、I、列表、链接（图标按钮）。
- 编辑模式：`contentEditable` 单区域，所见即所得。
- 预览模式：只读 HTML 预览。
- 实时保存：编辑即写入 localStorage。

## Data and Migration
- 首选读取 `cloudo.time.lightNoteHtml`。
- 若为空，尝试读取旧键 `cloudo.time.lightNote`（Markdown 文本）。
- 旧值首次迁移为基础 HTML（段落/列表/行内格式），并存入新键。

## Security and Sanitization
- 粘贴 HTML 时仅保留基础标签（p/br/strong/em/ul/ol/li/a/code）。
- 去除 script/style 与事件属性（on*）。
- 链接限制为安全协议（http/https/mailto/#/相对路径）。

## Visual Style
- 保持当前蓝灰配色。
- 工具栏按钮采用图标化、轻边框、低对比高可读。
- 右栏滚动条采用细胶囊样式（接近 Notes 的细胶囊视觉）。

## Acceptance Criteria
1. 支持 B/I/列表/链接四个基础富文本操作。
2. 编辑内容实时保存，刷新后不丢失格式。
3. 旧 Markdown 数据可自动迁移为基础 HTML。
4. 粘贴内容已过滤危险标签与危险属性。
5. 不引入文件树与评论能力。
