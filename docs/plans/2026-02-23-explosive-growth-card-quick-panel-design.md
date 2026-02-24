# Quick Panel 爆发卡片复用设计（Design）

## 目标

将待办浮窗展示样式改为 `etc/explosive-growth-card.html` 风格，并复用于独立浮窗与应用内浮层（若存在）。

## 当前状态

- 独立透明浮窗组件：`src/components/QuickPanelWindow.tsx`
- 历史应用内浮层样式存在：`src/styles.css` 中 `.quick-panel-mask/.quick-panel`
- 当前代码未发现正在渲染的应用内 quick-panel 组件。

## 方案

采用共享组件方案：

- 新建 `ExplosiveGrowthCard` 作为统一渲染模板（品牌头、分隔线、任务行、完成按钮）。
- `QuickPanelWindow` 使用该组件渲染真实任务数据。
- 对旧 `.quick-panel` 类补齐同风格样式，使应用内浮层若恢复渲染时自动复用视觉。

## 交互逻辑

- 单项点击勾选：沿用 `window.cloudo.toggleQuickPanelTask(todoId)`。
- 一键全部完成：仅对未完成项逐个触发 toggle。
- 空状态：显示“今日暂无任务”。

## 验收

- 独立浮窗视觉与 `explosive-growth-card.html` 一致（深色渐变、旋转边框、圆点勾选）。
- 单项勾选与一键完成可用。
- 应用内浮层相关样式同步为同风格（若该浮层存在）。

