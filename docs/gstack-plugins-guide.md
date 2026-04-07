# GStack 插件使用手册

本文档用于说明当前会话里常见的 `gstack`/技能插件怎么用，重点回答 4 个问题：

1. 这个插件是干什么的
2. 什么时候该用它
3. 你可以怎么对 AI 说
4. 它通常和哪些插件一起配合

## 1. 先理解：这里的“插件”是什么

在当前环境里，`gstack` 的“插件”更准确地说是 `skill`。  
你不一定需要输入固定命令，通常直接用自然语言说出目标就可以；如果你喜欢明确触发，也可以直接点名插件名。

常见触发方式有两种：

- 直接点名：`请使用 qa 测试这个站点`
- 自然语言触发：`帮我做一次上线后的 canary 检查`

## 2. 推荐使用顺序

如果你不知道先用哪个，优先按这个顺序选：

### 产品/方案阶段

- `office-hours`：先想清楚值不值得做
- `plan-ceo-review`：看方向和 scope 对不对
- `plan-design-review`：看体验和视觉方案是否过关
- `plan-eng-review`：锁定技术方案
- `plan-devex-review`：如果是面向开发者的产品，再补 DX 审查

### 开发/验证阶段

- `investigate`：先查根因
- `qa` 或 `qa-only`：系统测试
- `review`：合并前审查 diff
- `health`：跑整体健康检查

### 上线/收尾阶段

- `ship`：创建 PR、准备发布
- `land-and-deploy`：合并并验证部署
- `canary`：上线后持续观察
- `document-release`：同步文档
- `checkpoint`：保存当前工作状态

## 3. 核心 GStack 插件详解

下面按用途分类。

---

## 4. 规划与评审类

### `office-hours`

- 作用：在真正开工前，先判断需求是否值得做、从哪里切入最合适。
- 适用场景：新产品想法、功能方向犹豫、需要缩小 MVP。
- 你可以这样说：
```text
请用 office-hours 帮我判断这个想法值不值得做，并给我最小可行切入口。
```
- 搭配建议：`plan-ceo-review`、`plan-eng-review`

### `plan-ceo-review`

- 作用：站在 CEO / 创始人视角重新审视目标，看 scope 是否太小、方向是否足够强。
- 适用场景：你已经有一个计划，但担心不够有产品感。
- 你可以这样说：
```text
请用 plan-ceo-review 重新审视这个方案，看看哪里应该扩 scope，哪里该收缩。
```
- 搭配建议：`office-hours` 之后使用

### `plan-design-review`

- 作用：在开发前先做体验和视觉评审，减少做完再返工。
- 适用场景：页面改版、交互设计、设计方案评审。
- 你可以这样说：
```text
请用 plan-design-review 看一下这个页面方案，指出层级、布局和交互问题。
```
- 搭配建议：`design-shotgun`、`design-html`

### `plan-eng-review`

- 作用：从工程实现角度审查计划，关注架构、边界条件、测试和性能。
- 适用场景：准备开工前、复杂改造前。
- 你可以这样说：
```text
请用 plan-eng-review 帮我锁定这个功能的实现方案和测试范围。
```
- 搭配建议：`plan-ceo-review` 之后使用

### `plan-devex-review`

- 作用：审查开发者体验，特别适合 API、SDK、CLI、文档型产品。
- 适用场景：面向开发者的功能、平台、组件库。
- 你可以这样说：
```text
请用 plan-devex-review 检查这个 SDK 的上手路径和开发者体验。
```
- 搭配建议：`devex-review`

### `autoplan`

- 作用：自动串联多轮 review，帮你一次性跑完 CEO / 设计 / 工程 / DX 评审。
- 适用场景：你已经有 plan 文件，不想手动一轮轮 review。
- 你可以这样说：
```text
请用 autoplan 自动 review 这份计划，并帮我直接做决定。
```
- 搭配建议：大型任务开工前优先使用

---

## 5. 设计与前端类

### `design-consultation`

- 作用：从零梳理设计系统，产出品牌、字体、色彩、布局方向。
- 适用场景：新项目、没有设计系统的产品。
- 你可以这样说：
```text
请用 design-consultation 帮我给这个项目建立一套设计系统，并输出 DESIGN.md。
```
- 搭配建议：`design-shotgun`、`design-html`

### `design-shotgun`

- 作用：快速生成多个设计方向供比较。
- 适用场景：你知道要做什么，但不知道该长什么样。
- 你可以这样说：
```text
请用 design-shotgun 给这个首页出 3 个不同风格的方向。
```
- 搭配建议：`plan-design-review`

### `design-html`

- 作用：把设计方案落成真实 HTML/CSS。
- 适用场景：设计已经确定，需要前端落地稿。
- 你可以这样说：
```text
请用 design-html 把这个已确认的设计方案实现成可用页面。
```
- 搭配建议：`design-shotgun`、`design-review`

### `design-review`

- 作用：像设计师一样做视觉 QA，找出对齐、层级、节奏、视觉脏点。
- 适用场景：页面已经能跑，但看起来不够精致。
- 你可以这样说：
```text
请用 design-review 审查这个页面，并直接把视觉问题修掉。
```
- 搭配建议：`browse`、`benchmark`

### `frontend-design`

- 作用：直接生成更有设计感的前端界面代码。
- 适用场景：用户明确要做页面、组件、落地页、仪表盘。
- 你可以这样说：
```text
请用 frontend-design 帮我做一个更有辨识度的设置页 UI。
```
- 搭配建议：非 gstack 辅助技能，常和 `design-review` 配合

---

## 6. 调试、测试与质量类

### `investigate`

- 作用：按“先找根因，再修复”的流程排查问题。
- 适用场景：报错、功能突然失效、行为异常。
- 你可以这样说：
```text
请用 investigate 排查这个 500 错误，先给根因，再修复。
```
- 搭配建议：`qa`、`review`

### `qa`

- 作用：系统测试应用，并在发现问题后直接修复、回归验证。
- 适用场景：功能做完后准备验收；你怀疑页面还有隐藏 bug。
- 你可以这样说：
```text
请用 qa 对这个站点做一轮标准测试，发现问题就修复并验证。
```
- 搭配建议：`setup-browser-cookies`、`review`

### `qa-only`

- 作用：只测不改，输出问题报告。
- 适用场景：你想先看缺陷清单，不想立即改代码。
- 你可以这样说：
```text
请用 qa-only 测试这个页面，只给我 bug 报告，不要改代码。
```
- 搭配建议：`qa`

### `review`

- 作用：在提交或合并前审查当前 diff，优先找风险、回归、缺失测试。
- 适用场景：PR 前、准备 merge 前。
- 你可以这样说：
```text
请用 review 检查我当前改动，重点看回归风险和测试缺口。
```
- 搭配建议：`health`、`ship`

### `health`

- 作用：跑代码健康度检查，汇总测试、类型、Lint 等结果。
- 适用场景：你想知道代码库整体健康程度。
- 你可以这样说：
```text
请用 health 对这个项目做一次健康检查，并告诉我主要风险。
```
- 搭配建议：`review`

### `benchmark`

- 作用：比较页面性能和 Web Vitals 的变化。
- 适用场景：改了页面性能、怀疑有回归、要看 bundle/load 表现。
- 你可以这样说：
```text
请用 benchmark 对比这个页面改动前后的性能表现。
```
- 搭配建议：`canary`

### `devex-review`

- 作用：真实体验开发者上手过程，验证文档、CLI、SDK 是否顺滑。
- 适用场景：开发者产品、对外 SDK、文档站。
- 你可以这样说：
```text
请用 devex-review 真实走一遍 onboarding 流程，看看哪里卡人。
```
- 搭配建议：`plan-devex-review`

### `cso`

- 作用：做安全审计，包括依赖、密钥、CI/CD、常见漏洞面。
- 适用场景：上线前、安全巡检、敏感系统。
- 你可以这样说：
```text
请用 cso 对这个项目做一次安全审计，重点看 secrets 和供应链风险。
```
- 搭配建议：`review`

---

## 7. 浏览器、验收与上线类

### `browse`

- 作用：在无头浏览器里真实打开页面、点按钮、做截图、检查交互。
- 适用场景：页面验收、表单测试、回归测试。
- 你可以这样说：
```text
请用 browse 打开这个页面，帮我检查登录流程和移动端布局。
```
- 搭配建议：`qa`、`design-review`

### `gstack`

- 作用：浏览器自动化总入口，适合“打开页面并帮我验证”的广义需求。
- 适用场景：你不确定该用 `browse`、`qa` 还是 `canary`，先从这里说也可以。
- 你可以这样说：
```text
请用 gstack 帮我打开这个站点，检查首页、登录和控制台报错。
```
- 搭配建议：根据实际任务转入 `browse` / `qa` / `canary`

### `open-gstack-browser`

- 作用：启动一个你看得见的浏览器窗口，便于你实时观看 AI 操作。
- 适用场景：需要可视化操作、联调、登录态处理。
- 你可以这样说：
```text
请用 open-gstack-browser 打开可视浏览器，我要看你一步步操作。
```
- 搭配建议：`pair-agent`、`setup-browser-cookies`

### `setup-browser-cookies`

- 作用：把你本机浏览器里的登录 cookie 导入测试浏览器。
- 适用场景：要测登录后页面、后台、会员态页面。
- 你可以这样说：
```text
请用 setup-browser-cookies 导入我浏览器里的登录态，然后测试后台页面。
```
- 搭配建议：`browse`、`qa`

### `canary`

- 作用：部署后持续观察线上页面、控制台错误和性能异常。
- 适用场景：刚上线、刚合并、担心线上回归。
- 你可以这样说：
```text
请用 canary 监控这次部署后的首页和关键路径，看有没有异常。
```
- 搭配建议：`land-and-deploy`、`benchmark`

### `pair-agent`

- 作用：把浏览器访问能力共享给另一个远程 AI agent。
- 适用场景：多人或多 agent 协作测试。
- 你可以这样说：
```text
请用 pair-agent 生成一个连接方式，让另一个 agent 帮我一起测。
```
- 搭配建议：`open-gstack-browser`

### `setup-deploy`

- 作用：配置部署平台、生产地址、健康检查方式。
- 适用场景：第一次使用自动部署相关技能。
- 你可以这样说：
```text
请用 setup-deploy 帮我配置这个项目的部署信息。
```
- 搭配建议：`land-and-deploy`

### `ship`

- 作用：串起测试、版本、变更记录、提交、推送、PR 创建等流程。
- 适用场景：准备把当前代码正式推上去。
- 你可以这样说：
```text
请用 ship 帮我把这次改动整理好并创建 PR。
```
- 搭配建议：`review`、`document-release`

### `land-and-deploy`

- 作用：合并 PR、等待 CI/部署完成，并做上线后验证。
- 适用场景：代码已经 review 完，准备正式上线。
- 你可以这样说：
```text
请用 land-and-deploy 合并这个 PR 并验证生产环境。
```
- 搭配建议：`canary`

---

## 8. 文档、状态与流程辅助类

### `document-release`

- 作用：根据已完成改动同步更新 README、架构文档、CHANGELOG 等。
- 适用场景：功能已经做完，但文档还没跟上。
- 你可以这样说：
```text
请用 document-release 根据这次改动同步更新项目文档。
```
- 搭配建议：`ship`

### `checkpoint`

- 作用：保存当前工作上下文，方便中断后恢复。
- 适用场景：下班前、切任务前、会话要结束时。
- 你可以这样说：
```text
请用 checkpoint 帮我保存当前进度，并记录未完成事项。
```
- 搭配建议：任何长任务结束前

### `learn`

- 作用：查看或管理过去会话沉淀的经验和教训。
- 适用场景：你怀疑类似问题以前修过。
- 你可以这样说：
```text
请用 learn 看看这个问题以前有没有类似处理记录。
```
- 搭配建议：`investigate`

### `retro`

- 作用：做周回顾，统计产出、节奏、质量变化。
- 适用场景：周报、复盘、团队节奏分析。
- 你可以这样说：
```text
请用 retro 帮我做一份这周的工程复盘。
```
- 搭配建议：`checkpoint`

### `freeze`

- 作用：限制编辑范围，只允许修改指定目录。
- 适用场景：你只想让我改某个模块，避免误伤别处。
- 你可以这样说：
```text
请用 freeze，把本次改动范围限制在 src/components。
```
- 搭配建议：`guard`

### `unfreeze`

- 作用：取消编辑范围限制。
- 适用场景：任务范围扩大，需要继续改其他目录。
- 你可以这样说：
```text
请用 unfreeze，解除当前的目录编辑限制。
```

### `careful`

- 作用：在高风险操作前增加安全提醒。
- 适用场景：线上环境、删除数据、改部署、危险 git 操作。
- 你可以这样说：
```text
请用 careful 模式处理这次部署，我希望高风险操作前先提醒我。
```
- 搭配建议：`freeze`

### `guard`

- 作用：同时开启“危险操作提醒 + 目录编辑限制”。
- 适用场景：高风险排障、生产环境修复。
- 你可以这样说：
```text
请用 guard 模式，只允许改这个目录，并且危险操作先提醒。
```

---

## 9. 常见组合模板

### 新功能从 0 到 1

1. `office-hours`
2. `plan-ceo-review`
3. `plan-design-review`
4. `plan-eng-review`
5. `design-html` 或直接开发
6. `qa`
7. `review`
8. `ship`

### 修 Bug

1. `investigate`
2. `qa` 或局部验证
3. `review`
4. `checkpoint`

### 上线前后

1. `review`
2. `ship`
3. `land-and-deploy`
4. `canary`
5. `document-release`

### 做视觉质量提升

1. `design-shotgun`
2. `design-review`
3. `benchmark`

## 10. 一些常见提问句式

如果你想让 AI 更稳定地调用插件，可以直接照着下面说：

```text
请使用 qa，对这个项目做一轮标准测试，发现问题后直接修复并回归验证。
```

```text
请使用 review，检查我当前 diff 的风险点，重点关注行为回归和缺失测试。
```

```text
请使用 canary，监控这次部署后首页和登录流程 10 分钟。
```

```text
请使用 plan-eng-review，帮我把这份实现方案补齐边界条件、数据流和测试点。
```

## 11. 补充说明

- 如果你只描述目标，没有点名插件，系统也可能自动匹配合适插件。
- 如果你明确点名插件，通常会优先按你的指定来。
- 如果一个任务明显分阶段，最好直接说出链路，比如：`先 investigate，再 qa，最后 review`。

---

如果你愿意，我下一步可以继续帮你补一版“超简版速查表”，把所有插件整理成一页表格，适合贴在项目首页或 `README` 里。
