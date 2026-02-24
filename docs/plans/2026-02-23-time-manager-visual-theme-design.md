# Time Manager Visual Theme Refactor Design

**Date:** 2026-02-23

## Objective
仅重构时间管理页前端视觉：侧栏、顶部、三栏主体（快速添加/日程/轻笔记）高度贴近参考图；保留既有交互逻辑与数据结构。

## Constraints
- 不改业务数据模型（Todo / Timeline / LightNote 状态结构保持不变）
- 不改拖拽核心逻辑（drop、snap、lane 计算保持）
- 不改轻笔记编辑器内核（继续使用当前 contentEditable 流程）
- 仅改时间管理页及其相关视觉作用域

## Chosen Approach (A)
主题层重构：
1. 引入页面级 design tokens（浅蓝背景、圆角、阴影、标签色、强调色）
2. 对时间管理页添加语义化 class（header/clock pill/left-mid-right card）
3. 通过 scoped CSS 对现有组件皮肤化，不触碰业务状态流

## Layout Plan
- **Left rail:** 轻玻璃感浅色栏 + 圆形图标按钮
- **Header:** 标题 + 问候语 + 时间胶囊（当前时间）
- **Main 3 columns:**
  - 左：快速添加任务卡 + 待办池卡片
  - 中：日程计划卡 + 时间轴
  - 右：轻笔记卡（静态卡片化，保留现有编辑能力）

## Component Mapping
- `src/App.tsx`: 为 time_manager 页面注入壳类名 `time-manager-shell`
- `src/components/TimeManagerPage.tsx`: 增加视觉结构 class 与时间胶囊文案
- `src/styles.css`: 新增 time-manager scoped theme 覆盖样式

## Risk & Mitigation
- 风险：旧逻辑 DOM 结构与新视觉存在小幅混搭
- 缓解：仅添加 class，不删核心节点；通过 scoped CSS 增量覆盖

## Acceptance
- 页面风格与参考图视觉方向一致（浅蓝、卡片层次、圆角、按钮）
- 现有交互（拖拽、详情、轻笔记编辑）保持可用
- 非时间管理页视觉不受影响
