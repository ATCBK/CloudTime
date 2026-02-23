# Time Manager Independent Quick Panel Design

**Date:** 2026-02-23

## Context
用户已确认以下目标：
- 快捷面板改为独立透明 `BrowserWindow`，可脱离主窗口单独显示于桌面。
- 快捷面板由应用内按钮与全局快捷键共同唤起，作用于同一个浮窗实例。
- 设置页新增快捷面板透明度，独立于主窗口透明度。
- 待办池与时间轴隔离：待办拖入时间轴后从待办池移除；时间轴回拖到待办池后从时间轴移除并恢复为待办。
- 时间轴卡片提供详情按钮；拖拽到轻笔记为“富文本卡片引用（标题/时间/项目）”，不移除时间轴项。

## Architecture
1. 主进程维护两个窗口：`mainWindow` + `quickPanelWindow`。
2. 快捷面板窗口独立加载 renderer（通过 query 参数区分入口），使用透明、无边框、置顶样式。
3. 主进程作为同步中枢：
   - `quickPanel:toggle`：显示/隐藏独立浮窗。
   - `quickPanel:setOpacity`：设置浮窗透明度。
   - `quickPanel:state:update`：主窗口推送当天任务快照给浮窗。
4. renderer 分为两种渲染模式：
   - 主应用 `App`
   - 快捷浮窗 `QuickPanelWindow`
5. 数据持久化保持本地 `localStorage`，快捷浮窗通过 IPC 接收当前任务并回传勾选动作，由主窗口写回。

## Components
- `electron/main.ts`
  - 新增 `quickPanelWindow` 生命周期、热键与 IPC。
- `electron/preload.ts`
  - 暴露 quick panel toggle / opacity / state / action API。
- `src/main.tsx`
  - 根据 URL 参数切换渲染 `App` 或 `QuickPanelWindow`。
- `src/components/QuickPanelWindow.tsx`
  - 透明清单 UI、快速勾选、仅保留最小交互。
- `src/App.tsx` + `src/components/SettingsPage.tsx` + `src/types.ts`
  - 新增 `quickPanelOpacity` 设置项及联动调用。
- `src/components/TimeManagerPage.tsx`
  - todo->timeline 后删除 todo；timeline->todo 回拖恢复。
  - 将“快捷面板”按钮改为调用主进程 toggle。
  - 将当天任务映射推送到 quick panel。

## Data Flow
1. 主页面加载后根据 `scheduledItems + todos` 生成 `QuickPanelSnapshot[]`。
2. 主页面调用 `window.cloudo.updateQuickPanelState(snapshot)`。
3. 快捷浮窗订阅 `onQuickPanelState` 更新列表。
4. 用户在浮窗勾选后 `window.cloudo.toggleQuickPanelTask(todoId)`。
5. 主窗口监听事件后切换 todo completed，并再次推送最新 snapshot。

## Error Handling
- 快捷浮窗未创建时，`toggle`/`setOpacity` 自动初始化后执行。
- 若无主窗口上下文，浮窗显示“暂无任务”，并在收到状态后刷新。
- IPC 输入统一做边界处理：透明度限定在 `[0.2, 1]`。

## Testing Strategy
- 先新增纯函数测试，覆盖 quick panel snapshot 生成与任务隔离逻辑。
- 运行已有单测确保富文本与拖拽数学逻辑不回归。
- 最后执行 `typecheck` 与 `build:electron` 验证双窗口与 preload 类型完整。
