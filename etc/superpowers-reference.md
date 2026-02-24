# Superpowers 插件与功能总览

本文档汇总当前会话可用的 superpowers 技能（插件），用于快速查阅“什么时候用、用来做什么、如何组合使用”。

## 使用原则

1. 先选流程技能，再选实现技能。
2. 涉及创作/功能改动时，优先 `brainstorming`。
3. 涉及实现时，优先 `test-driven-development` + `verification-before-completion`。
4. 大任务先拆计划，再执行计划。

## 技能清单（按用途分组）

## 一、流程与方法类

### 1. using-superpowers
- 作用：会话起始时建立技能使用纪律，确保先做技能判断再执行任务。
- 适用：任何新会话、任何新需求开始时。
- 典型用法：先声明将使用哪些技能，再进入任务。

### 2. brainstorming
- 作用：在创作或功能变更前，先明确目标、约束、方案和设计。
- 适用：创建功能、改页面、改交互、改行为。
- 典型用法：先问清需求 -> 给 2-3 方案 -> 确认后再实现。

### 3. writing-plans
- 作用：把已确认需求写成可执行的多步骤计划。
- 适用：中大型任务、多人协作、复杂改造。
- 典型用法：输出到 `docs/plans/YYYY-MM-DD-*.md`，按任务颗粒拆解。

### 4. create-plan
- 作用：用户明确要求“先给计划”时输出精简计划。
- 适用：需求明确、先要路线图。
- 典型用法：3-8 步计划，标注依赖和验收点。

### 5. executing-plans
- 作用：在已有计划前提下，按计划分步执行并检查。
- 适用：跨多个任务点的实施阶段。
- 典型用法：按任务顺序执行，每步产出可验证结果。

### 6. subagent-driven-development
- 作用：将计划拆分为独立任务并在当前会话推进执行。
- 适用：任务可并行但需要主会话统一把控质量。
- 典型用法：一任务一子代理，阶段复盘后继续。

### 7. dispatching-parallel-agents
- 作用：多独立任务并行推进，提升整体吞吐。
- 适用：2 个以上互不依赖任务。
- 典型用法：先拆边界，再并行执行，最后统一集成。

### 8. systematic-debugging
- 作用：标准化排障流程，避免“拍脑袋修复”。
- 适用：Bug、异常、回归问题。
- 典型用法：假设 -> 验证 -> 复现 -> 修复 -> 回归验证。

### 9. test-driven-development
- 作用：测试先行（红-绿-重构）保证行为正确。
- 适用：功能开发、Bug 修复、行为调整。
- 典型用法：先写失败测试 -> 最小实现通过 -> 再重构。

### 10. verification-before-completion
- 作用：宣称“完成”前必须先验证。
- 适用：收尾、提交前、合并前。
- 典型用法：跑测试/构建/关键路径检查，再给结论。

## 二、协作与评审类

### 11. requesting-code-review
- 作用：主动发起代码审查，识别风险和缺口。
- 适用：功能完成后、合并前。
- 典型用法：聚焦行为回归、边界条件、测试覆盖。

### 12. receiving-code-review
- 作用：收到评审意见后，先做技术验证再处理。
- 适用：评审反馈不明确或有争议时。
- 典型用法：逐条确认可行性，再实施改动。

### 13. finishing-a-development-branch
- 作用：开发完成后选择合并路径并收尾。
- 适用：分支结束、准备合并/PR。
- 典型用法：检查状态 -> 选择 merge/PR/清理策略。

### 14. using-git-worktrees
- 作用：为特性开发创建隔离工作树。
- 适用：并行开发、风险隔离、计划执行前。
- 典型用法：新建 worktree，避免污染当前工作区。

## 三、文档与内容类

### 15. doc
- 作用：处理 `.docx` 文档读写与版式。
- 适用：Word 文档创建、编辑、排版检查。
- 典型用法：`python-docx` + 渲染脚本进行可视校验。

### 16. writing-skills
- 作用：创建或修改技能本身（Skill 规范）。
- 适用：维护技能库、升级技能流程。
- 典型用法：调整 SKILL.md、验证执行链路。

### 17. skill-creator
- 作用：指导如何设计高质量新技能。
- 适用：需要扩展新的专用能力。
- 典型用法：定义目标、触发条件、步骤、失败回退。

### 18. skill-installer
- 作用：安装可复用技能到技能目录。
- 适用：引入新技能集、从仓库安装技能。
- 典型用法：列出可安装技能 -> 选择 -> 安装并验证。

## 四、执行序列建议（推荐）

### 新功能开发
1. `brainstorming`
2. `writing-plans`
3. `test-driven-development`
4. `verification-before-completion`
5. `requesting-code-review`

### Bug 修复
1. `systematic-debugging`
2. `test-driven-development`
3. `verification-before-completion`
4. `requesting-code-review`

### 大型并行任务
1. `using-git-worktrees`
2. `writing-plans`
3. `dispatching-parallel-agents` / `subagent-driven-development`
4. `verification-before-completion`

## 五、给使用者的提示词模板

### 模板 A：标准开发
```text
请使用 superpowers：先 brainstorming，再 writing-plans，再 test-driven-development 实现。
目标：XXX
范围：只改动 XXX 目录
验收：A/B/C 必须成立
```

### 模板 B：快速排障
```text
请使用 systematic-debugging 排查 XXX 问题，先给复现和验证步骤，再修复并补测试。
```

### 模板 C：收尾检查
```text
请使用 verification-before-completion，执行所有必要验证后再给“完成”结论。
```

## 六、结论

Superpowers 的核心价值不是“多一个命令”，而是把开发从“临时发挥”升级为“可复用流程”。

在你的项目里，最实用的最小组合是：
- `brainstorming` + `test-driven-development` + `verification-before-completion`
