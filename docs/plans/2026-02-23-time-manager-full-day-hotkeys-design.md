# Time Manager Full-Day + Hotkeys Design

**Date:** 2026-02-23

## Scope
- 时间轴改为 00:00-24:00 并可滚动。
- 当前时间线按系统本地时区实时刷新，跨天自动切换到当天并自动定位。
- 独立浮窗升级为柔和极简风，支持内嵌快速创建（标题/时间/详情）。
- 设置页新增浮窗快捷键与快速创建快捷键，自定义时冲突则提示且不保存。
- 周视图改为混合模式：默认紧凑，点击某天展开 24 小时轴。

## Design Decisions
1. **时钟逻辑纯函数化**：抽离 `timeManagerClock.ts`，降低页面复杂度并可测试。
2. **快捷键注册由主进程统一管理**：通过 `hotkeys:setDynamic` 一次性校验+注册，失败自动回滚旧快捷键。
3. **浮窗创建事件通过 IPC 回流主窗口**：由 `App` 统一落盘到 `localStorage`，避免页面切换导致丢失。
4. **周视图混合**：保持原紧凑信息密度，按需展开当日 24 小时轴，避免始终高成本渲染。

## Failure Handling
- 快捷键冲突：返回错误信息，不覆盖当前生效快捷键。
- 快捷创建时间输入非法：回退为“当前时刻起 60 分钟”。
- 存储异常：忽略写入异常，保留 UI 可交互性。

## Verification
- 新增 `timeManagerClock.test.ts` 覆盖 24 小时/跨天/时间解析。
- 保持既有 `quickPanelState`、`timeManagerActions`、`lightNoteRichText`、`timeDragMath` 测试通过。
- `typecheck` + `build:electron` 作为最终门禁。
