# ui-ux-pro-max 使用说明

本文档说明如何在当前项目中使用 `ui-ux-pro-max` 技能。

## 1. 这个技能能做什么

`ui-ux-pro-max` 主要用于 UI/UX 设计与改造，包括：

- 页面/组件设计（Landing、Dashboard、后台、移动端）
- 风格建议（极简、玻璃拟态、暗黑、Bento 等）
- 配色与字体搭配建议
- 可访问性与交互体验检查
- 按技术栈给实现建议（Tailwind/React/Vue/Next.js 等）

## 2. 最简单的用法（推荐）

在 Codex 对话里直接明确提到技能名并给出目标。

示例：

```text
请使用 ui-ux-pro-max，重做我的侧边栏：更细、保留图标动效、移动端也可用。
```

```text
用 ui-ux-pro-max 帮我评审这个页面，按严重程度列出 UI/UX 问题并给修改方案。
```

```text
使用 ui-ux-pro-max，为“时间管理看板”给出一套中文设计系统：颜色、字体、间距、按钮、卡片规范。
```

## 3. 推荐工作流

1. 先给需求：页面类型 + 行业 + 风格关键词 + 技术栈
2. 让技能先产出设计系统（颜色/字体/组件规则）
3. 再让它按页面逐步落地代码
4. 最后做一轮 UX 检查（可访问性、响应式、交互反馈）

可直接复制的需求模板：

```text
请使用 ui-ux-pro-max。
项目类型：SaaS 仪表盘
风格关键词：专业、克制、轻玻璃感
目标端：桌面优先，兼容移动端
技术栈：HTML + Tailwind
请先输出设计系统，再实现页面代码。
```

## 4. 命令行方式（可选）

该技能文档里给了 `search.py` 的命令行检索方式（用于查设计规则）。
常见命令形态：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
```

如果你在本机执行命令时报路径不存在，优先用对话触发方式（第 2 节），或重新安装技能：

```bash
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --agent codex --global -y
```

## 5. 当前环境安装状态

你已安装过该技能（Codex）。

- 本地项目路径：`etc/.agents/skills/ui-ux-pro-max/`
- 全局路径：`C:/Users/32118/.agents/skills/ui-ux-pro-max/`

---

如果你愿意，我可以基于这个技能再给你补一份：
`ui-ux-pro-max-提示词清单.md`（按“新建页面 / 改版 / 评审 / 修复”四类整理成可直接复制的 Prompt）。
