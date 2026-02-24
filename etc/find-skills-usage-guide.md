# find-skills 使用指南（学习版）

本文档用于快速上手 `find-skills` 这个技能，目标是让你能自己完成「查找技能 -> 安装技能 -> 验证技能」的完整流程。

## 1. 这个技能是做什么的

`find-skills` 的核心用途：

- 当你不知道“某件事有没有现成 skill”时，帮你检索
- 当你想扩展 Agent 能力时，给出安装命令
- 当没搜到结果时，给出替代方案

典型场景：

- “有适合 React 性能优化的 skill 吗？”
- “能不能找个 PR review 的 skill？”
- “我想给 Agent 增加文档自动化能力，有现成的吗？”

## 2. 前置条件

- 已安装 Node.js（建议 LTS）
- 能在终端运行 `npx`
- 网络可用（用于检索/安装）

可先自检：

```bash
node -v
npx -v
```

## 3. 最常用命令

```bash
npx skills find <query>
npx skills add <owner/repo@skill>
npx skills check
npx skills update
```

说明：

- `find`：搜索技能
- `add`：安装技能
- `check`：检查更新
- `update`：更新已安装技能

## 4. 标准操作流程（建议照这个顺序）

1. 明确需求关键词
2. 搜索技能
3. 评估候选项
4. 安装技能
5. 验证是否可用

示例：

```bash
# 1) 搜索
npx skills find react performance

# 2) 安装（把下面替换为实际搜索结果）
npx skills add vercel-labs/agent-skills@vercel-react-best-practices

# 3) 检查更新状态
npx skills check
```

## 5. 如何挑关键词（提升搜索命中）

- 用“领域 + 任务”组合：如 `react testing`、`deploy ci-cd`
- 同义词轮换：`deploy` / `deployment` / `release`
- 从宽到窄：先 `testing`，再 `playwright e2e`

## 6. 给 AI 的提问模板（可直接复制）

```text
请用 find-skills 帮我找“<你的需求>”相关技能。
要求：
1) 给我 2-3 个候选 skill
2) 每个 skill 说明适用场景
3) 给出精确安装命令
4) 如果没有合适 skill，给我可执行的替代方案
```

## 7. 没搜到怎么办

如果 `find` 没有结果，按这个顺序处理：

1. 换关键词（更具体或换同义词）
2. 缩小问题范围（先找通用能力）
3. 直接让 Agent 按通用能力先完成任务
4. 高频需求再考虑自建 skill（如 `npx skills init <name>`）

## 8. 常见问题排查

- `npx skills` 无法执行：
  - 检查 Node.js 与 npm/npx 是否安装
- 安装失败：
  - 检查网络、代理、包名是否准确
- 安装后没生效：
  - 重开终端会话后再检查
  - 重新执行 `npx skills check`

## 9. 一条最短学习路径

只做这三步就能入门：

1. `npx skills find testing`
2. 挑一个结果执行 `npx skills add <owner/repo@skill>`
3. 用一次真实任务验证这个 skill 是否提高效率

---

参考入口：<https://skills.sh/>
