# 时间管理页字体与视觉规范（v1）

## 1. 字体族

- UI/标题：`"Quicksand", "Noto Sans SC", sans-serif`
- 正文/笔记：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`

## 2. 文本层级

- 大标题（仪表盘标题）：`28px / 600 / --tm-text-primary`
- 面板标题：`18px / 700 / --tm-text-primary`
- 任务卡标题：`15px / 500 / --tm-text-primary`
- 正文/描述：`14px / 400 / --tm-text-muted 或主文本色`
- 元信息（时间/标签）：`12px / 500 / --tm-text-muted`

## 3. 圆角系统

- 面板：`24px`
- 卡片：`16px`
- 输入框与引用块：`12px`

## 4. 关键视觉细节

- 轻笔记引用块背景：`rgba(59, 130, 246, 0.05)`，保持轻盈层次
- 时间管理页使用 scoped token，避免影响其他页面

## 5. 已在代码中生效位置

- 样式文件：`src/styles.css`
- 作用域：`.time-manager-shell` 与 `.time-manager-page` 下的标题、卡片、输入框、轻笔记编辑区

