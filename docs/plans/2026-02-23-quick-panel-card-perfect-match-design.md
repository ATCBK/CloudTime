# Quick Panel 卡片样式 100% 对齐设计（Design）

## 目标

- 删除卡片后白底（quick-panel 透明背景）。
- 待办卡片样式按 `etc/explosive-growth-card.html` + `etc/explosive-growth-card.css` 逐项还原。

## 范围

- 仅调整 quick-panel 相关渲染与样式。
- 不改任务数据结构，不改 IPC 协议。

## 关键设计点

- 在 quick-panel 视图初始化阶段（渲染前）给 `html/body` 打上 `quick-panel-window-view`，消除白底闪现。
- `ExplosiveGrowthCard` 样式值对齐参考文件（尺寸、圆角、渐变、动画、字体大小、按钮、done 态）。
- 保留当前交互：单项勾选 + 一键全部完成。

## 验收

- 快捷浮窗中，卡片后方不出现白底。
- 卡片视觉与 `etc/explosive-growth-card.html` 达到 100% 样式对齐。
- 编译与测试通过。

