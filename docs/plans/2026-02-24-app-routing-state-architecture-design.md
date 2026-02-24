# App Routing & State Architecture Design

**Date:** 2026-02-24  
**Scope:** 全应用展示层深度重构（App + 路由 + 状态组织），功能零回归

## 1. Architecture

采用 `react-router-dom` + `zustand`：
- 路由层：`/time`、`/notes`、`/settings`，`/` 自动重定向到上次访问页。
- 布局层：抽离 `AppShellLayout`，统一侧边栏、内容容器、窗口事件绑定。
- 状态层：将应用级状态从 `App.tsx` 拆为 store（导航、设置、运行时）。
- 视图层：`TimeManagerPage`、`NotesPage`、`SettingsPage` 保持业务逻辑不变，先做接入解耦。

## 2. Components

新增/重构核心组件：
- `src/app/AppRouter.tsx`：路由定义、入口重定向、页面装配。
- `src/app/AppShellLayout.tsx`：统一壳层，处理 sidebar 导航与 page 渲染容器。
- `src/app/navigation.ts`：`AppPage <-> path` 映射及容错转换。
- `src/stores/useNavigationStore.ts`：持久化当前页面（兼容原 key）。
- `src/stores/useSettingsStore.ts`：持久化设置（兼容原 key 与默认值）。
- `src/stores/useRuntimeStore.ts`：运行时状态（如 `baseDir`）。
- `src/app/AppEffects.tsx`：窗口透明度、快捷键同步、QuickCreate 聚焦等副作用集中管理。

## 3. Data Flow

1. `main.tsx` 判断 quick-panel 视图；主视图进入 `AppRouter`。
2. `AppRouter` 从导航 store 读取上次页并完成 `/` 重定向。
3. `AppShellLayout` 根据路由派生 `activePage`，渲染 `Sidebar + Outlet`。
4. `AppEffects` 监听 store：
- 设置变更 -> `window.cloudo.setWindowOpacity / setQuickPanelOpacity`
- 热键拉取/保存 -> 更新 settings store
- quick-create 事件 -> 导航到 time 并触发聚焦事件

## 4. Error Handling

- 路由解析失败：兜底到 `/time`。
- hotkey 同步失败：保留本地配置，不中断 UI。
- 获取 `baseDir` 失败：显示 `"不可用"`。
- 设置数据缺字段：统一走 `normalizeSettings` 补齐默认值。

## 5. Testing Strategy

TDD 范围：
- `navigation` 映射测试（路径与页面双向映射）。
- `settings` 规范化测试（旧数据兼容、默认值补齐）。
- `AppEffects` 关键副作用测试（通过可注入函数/纯函数测试）。

回归验证：
- `npm test`
- `npm run typecheck`
- `npm run build`

手工回归清单（全量）：
- 页面切换（time/notes/settings）与刷新后的路由恢复。
- 时间管理：新建待办、拖拽排期、日/周/月切换、删除与撤销。
- 笔记：文件树操作、编辑/预览、批注、目录跳转。
- 设置：透明度、浮窗透明度、快捷键保存与恢复默认。
- 快捷浮窗：打开/关闭、勾选同步主窗口状态。
