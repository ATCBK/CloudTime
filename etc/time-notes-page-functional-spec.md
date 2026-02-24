# CloudTime 全项目复刻规范（单文档版）

本文档用于让 AI 一次性复刻当前项目的主要布局与交互，不是原型，不是 etc 示例页，而是基于 `src + electron` 的实际实现。

## 1. 目标与范围

- 目标：复刻 CloudTime（Cloudo）桌面应用的主结构、主要功能与核心交互流程。
- 范围：
  - 主窗口：`时间待办`、`笔记`、`设置`
  - 侧边导航与页面切换
  - 快捷浮窗（独立窗口）
  - Electron IPC 与快捷键联动
- 不在本次范围：
  - 像素级视觉特效逐项抄写（可保持近似）
  - 历史兼容逻辑的全部边缘分支

## 2. 技术与运行形态

- 技术栈：Electron + React 18 + TypeScript + Vite
- 渲染入口：`src/main.tsx`
- 两种渲染视图：
  - 主窗口视图：`<App />`
  - 浮窗视图：`<QuickPanelWindow />`（通过 URL query `?view=quick-panel`）
- Electron 主进程创建两个 BrowserWindow：
  - 主窗口：1200 x 760（有边框）
  - 快捷浮窗：460 x 620（无边框、透明、置顶）

## 3. 全局信息架构

```text
App Shell
├─ Sidebar (48px)
│  ├─ 时间待办
│  ├─ 笔记
│  └─ 设置
└─ Content (1fr)
   └─ Active Page
      ├─ TimeManagerPage
      ├─ NotesPage
      └─ SettingsPage
```

## 4. 全局布局蓝图（主窗口）

```text
+---------------------------------------------------------------+
| Sidebar 48px |                   Content 1fr                  |
|              | +-------------------------------------------+  |
| [时]         | | Active Page                               |  |
| [笔]         | |                                           |  |
|          [设]| |  TimeManager / Notes / Settings           |  |
|              | |                                           |  |
|              | +-------------------------------------------+  |
+---------------------------------------------------------------+
```

## 5. 页面切换状态机（全局）

```text
[time_manager] <-> [notes] <-> [settings]
       ^                        |
       |------------------------|

触发：Sidebar icon click
持久化：cloudo.app.activePage
```

页面切换规则：

- 点击侧边栏图标仅切换 `activePage`，不销毁整个 App shell。
- 页面状态由各页面自己的 localStorage key 持久化。
- 从快捷键触发“快速创建待办”时，强制切回 `time_manager` 并聚焦输入框。

## 6. TimeManagerPage 复刻规范

### 6.1 布局结构

```text
TimeManagerPage
├─ Topbar（标题 + 问候 + 当前时间胶囊）
├─ Toolbar（视图切换 + 工具按钮）
└─ Three Pane（可拖拽分栏）
   ├─ Left  : 快速创建 + 待办池
   ├─ Middle: 日/周/月日程
   └─ Right : 轻笔记
```

### 6.2 尺寸与比例（必须对齐）

- 三栏默认比例：`24% / 46% / 30%`
- 两个分割条宽度：`8px`
- 最小宽度约束：
  - left >= 18%
  - middle >= 34%
  - right >= 18%
- 时间轴：
  - 24 小时
  - 每小时高度 `56px`
  - 最小任务块时长 `15 分钟`
  - 吸附步长 `15 分钟`

### 6.3 左栏（待办）功能

- 快速创建表单：标题、项目、时长、详情、新建按钮
- 待办池列表项能力：
  - 完成/恢复
  - 展开详情
  - 删除
  - 拖拽到时间轴排期

交互规则：

- 标题为空时禁止创建。
- 拖拽待办进入时间轴时显示 drop preview。
- 待办完成状态需同步到已排期项目。

### 6.4 中栏（日/周/月）功能

- 日视图：时间轴 + 任务块（支持拖动改时间）
- 周视图：7 天格子 + 可展开单日 24 小时条带
- 月视图：6x7 日期格，点击日期切换回日视图

日视图任务块操作：

- 查看详情（眼睛按钮）
- 删除（X 按钮）
- 拖拽手柄（拖到待办池或轻笔记）
- 拖动位置改变开始/结束时间（按 15 分钟吸附）

删除流程：

```text
点击删除 -> 弹确认层 -> 确认删除
-> 底部显示 5 秒撤销条
-> 5 秒内可恢复
```

### 6.5 右栏（轻笔记）功能

- contentEditable 编辑区
- 工具按钮：加粗、斜体、无序列表、插入链接
- 支持接收日程卡片拖入，生成任务参考卡片
- 粘贴时进行 HTML 清洗

### 6.6 TimeManager 状态机

```text
[Idle]
  | drag todo
  v
[DraggingTodo] --drop timeline--> [ScheduleCreated] -> [Idle]
  | cancel
  v
[Idle]

[Idle]
  | drag schedule
  v
[DraggingSchedule]
  | drop todo pool -> [BackToTodo]
  | drop light note -> [AppendReference]
  | cancel -> [Idle]

[Idle] --mousedown divider--> [ResizingPane] --mouseup--> [Idle]
[Idle] --delete schedule--> [ConfirmDelete] --confirm--> [UndoWindow(5s)]
```

### 6.7 TimeManager 持久化键

- `cloudo.time.calendarView`
- `cloudo.time.selectedDateKey`
- `cloudo.time.todos`
- `cloudo.time.scheduledItems`
- `cloudo.time.newTodoProject`
- `cloudo.time.newTodoDuration`
- `cloudo.time.paneWidths`
- `cloudo.time.lightNoteHtml`

## 7. NotesPage 复刻规范

### 7.1 布局结构

```text
NotesPage
├─ Topbar（标题 + 存储路径）
└─ Workspace（左右主分区）
   ├─ Left Panel : 文件树
   └─ Right Panel: 编辑区
      ├─ 编辑工具栏
      └─ Editor Body（再三分）
         ├─ TOC
         ├─ Editor/Preview 主区
         └─ 评论与批注
```

### 7.2 关键尺寸关系（必须对齐）

主工作区列：

- `grid-template-columns = leftPaneWidth + divider(6) + 1fr`
- 默认 `leftPaneWidth = 280px`
- 左栏折叠宽 `34px`
- 左栏拖拽最小约束 `>=220px`

编辑体三列：

- `grid-template-columns = tocWidth + divider(6) + 1fr + divider(6) + commentWidth`
- 默认：`tocWidth = 260px`，`commentWidth = 280px`
- 折叠宽：`toc=34px`，`comment=40px`
- 最小约束：`toc>=180px`，`comment>=220px`

主阅读区：

- editor canvas 目标宽度：`min(1120px, 100%)`
- 长文横向溢出禁止，必须自动换行

### 7.3 文件树能力

- 目录树节点：文件夹 + 文件
- 支持：
  - 新建文件
  - 新建文件夹
  - 重命名
  - 删除
  - 展开/折叠
  - 右键菜单（剪切/复制/粘贴）
- 选中文件后在编辑区打开

### 7.4 编辑区能力（WYSIWYG）

- 编辑/预览双模式切换
- 内联工具栏：撤销、重做、段落格式、列表、粗斜体、链接、清除格式、更多菜单
- 选区浮动菜单 + 选区右键菜单
- 段落格式菜单支持：正文、H1-H4、有序/无序列表、任务、代码块

### 7.5 TOC（目录）能力

- 从文档 H1-H4 动态生成树
- 支持折叠节点
- 点击目录项滚动定位正文并闪烁高亮
- TOC 面板支持折叠与拖拽调宽

### 7.6 评论与批注能力

- 评论输入与发布
- 评论列表展示时间
- 删除评论
- 选中文本后可“关联评论”生成锚点高亮
- 点击评论可回跳定位对应锚点

### 7.7 Notes 状态机

```text
[EditMode] <-> [PreviewMode]
[Normal] <-> [FocusMode]
[TreeExpanded] <-> [TreeCollapsed]
[TocExpanded] <-> [TocCollapsed]
[CommentExpanded] <-> [CommentCollapsed]

[Idle] --text selection--> [SelectionToolbarVisible]
[SelectionToolbarVisible] --apply format/comment--> [Idle]
```

### 7.8 Notes 持久化键

- `cloudo.notes.tree`
- `cloudo.notes.expanded`
- `cloudo.notes.selectedFolder`
- `cloudo.notes.leftPaneWidth`
- `cloudo.notes.commentPaneWidth`
- `cloudo.notes.treePanelCollapsed`
- `cloudo.notes.tocPanelCollapsed`
- `cloudo.notes.commentPanelCollapsed`
- `cloudo.notes.focusMode`
- `cloudo.notes.richList`
- `cloudo.notes.currentNote`
- `cloudo.notes.editorMode`
- `cloudo.notes.tocPaneWidth`
- `cloudo.notes.tocCollapsedIds`
- `cloudo.notes.toolbarOrder`
- `cloudo.notes.commentsByNote`

## 8. SettingsPage 复刻规范

### 8.1 布局

```text
SettingsPage
└─ settings-grid（3列卡片）
   ├─ 外观
   ├─ 快捷键
   └─ 存储说明
```

### 8.2 功能

外观：

- 主窗口透明度滑块（20%-100%）
- 快捷浮窗透明度滑块（20%-100%）

快捷键：

- 浮窗显示/隐藏快捷键（默认 Alt+Q）
- 快捷创建待办快捷键（默认 Alt+N）
- 保存快捷键（冲突时失败并提示）
- 恢复默认

提示：

- 主窗口切换快捷键固定：`Alt+Space`

## 9. 快捷浮窗（QuickPanelWindow）复刻规范

### 9.1 视图结构

```text
QuickPanelWindow
└─ ExplosiveGrowthCard
   ├─ 标题（按日期格式化）
   ├─ 今日任务列表
   └─ 一键完成按钮
```

### 9.2 行为

- 只显示今日排期任务的精简卡片
- 点击复选框 -> 通过 IPC 反向切换主窗口任务完成状态
- 一键完成 -> 逐个触发未完成任务切换

## 10. Electron 事件流（必须复刻）

### 10.1 快捷键与窗口

```text
Alt+Space -> 主窗口显隐切换
Alt+Q     -> 浮窗显隐切换（可配置）
Alt+N     -> 主窗口切到 time_manager 并聚焦“新建待办”输入（可配置）
```

### 10.2 IPC 主链路

```text
Renderer(App)
  -> window:setOpacity
  -> quickPanel:setOpacity
  -> quickPanel:updateState
  -> hotkeys:getDynamic / hotkeys:setDynamic
  -> storage:getBaseDir

Main Process
  -> quick-panel:state (推送给浮窗)
  -> quick-panel:toggle-task (推送给主窗口)
  -> quick-create:focus (推送给主窗口)
```

## 11. AI 生成硬性约束

- 必须保留三页面结构：`time_manager` / `notes` / `settings`
- 必须保留 48px 细侧边栏与 3 个导航图标位置关系（设置在底部）
- 必须保留 TimeManager 三栏可调宽布局及 15 分钟吸附逻辑
- 必须保留 Notes 的“树 + 编辑 + TOC + 评论”四块能力
- 必须保留 Electron 双窗口模型（主窗口 + 浮窗）
- 不能把 Notes 简化成单 textarea
- 不能把 TimeManager 简化成普通待办列表（必须有时间轴）
- 不能移除本地持久化（localStorage）

## 12. 复刻验收清单

- 页面结构验收：
  - 侧边栏切换正常
  - 三个页面都可进入
- TimeManager 验收：
  - 新建待办成功
  - 待办可拖到时间轴
  - 日程可拖动调整时间
  - 删除有确认与撤销
- Notes 验收：
  - 文件树增删改查可用
  - 编辑/预览切换可用
  - TOC 跳转可用
  - 评论与批注可用
- Settings 验收：
  - 透明度滑块生效
  - 快捷键可保存并校验冲突
- 浮窗验收：
  - 可独立显示
  - 勾选会同步主窗口状态

## 13. 一次性喂给 AI 的输入模板

```text
请严格按以下规范复刻 CloudTime 桌面应用：
1) Electron + React + TypeScript + Vite。
2) 主窗口布局：48px 左侧细栏 + 右侧内容区，侧栏含“时间待办/笔记/设置”。
3) TimeManager 页面：顶部信息 + 工具条 + 三栏可拖拽布局（默认 24/46/30，分割条 8px），
   左栏为待办创建与待办池；中栏为日/周/月视图，日视图为 24 小时时间轴（56px/小时、15分钟吸附）；
   右栏为轻笔记（contentEditable + 基础工具）。
4) Notes 页面：文件树 + 编辑区；编辑区含 TOC、编辑/预览主区、评论面板，三者可折叠并可拖拽调宽。
5) Settings 页面：主窗透明度、浮窗透明度、两项快捷键（保存/恢复默认）。
6) 浮窗独立窗口（460x620，无边框透明置顶）显示今日任务卡片并可勾选同步主窗口。
7) 必须保留 localStorage 持久化与 IPC 事件流，不允许降级为静态页面。
```
