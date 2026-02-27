# Pencil MCP 深度使用文档

## 1. 先说明：你截图里的 Pencil 扩展和 MCP 的关系
- 你安装的 `Pencil`（VS Code 扩展）主要负责设计文件浏览/编辑能力，本身不等于一个标准 MCP Server。
- 要让 AI 通过 MCP 读取设计上下文，通常需要：
  - 一个可用的 Pencil MCP 远端端点（SSE/HTTP）。
  - 或者你自己的桥接服务把 Pencil 数据暴露成 MCP 协议。

本项目已帮你放好 MCP 配置模板：
- [.vscode/mcp.json](d:/Project_building/Clouddo1/CloudTime/.vscode/mcp.json)

---

## 2. 当前项目内已配置的 MCP 结构
配置文件里有两个 server：

1. `filesystem_cloudo`（本地文件系统）
- 用于让 AI 读取本项目文件。
- 命令：`npx -y @modelcontextprotocol/server-filesystem d:\Project_building\Clouddo1\CloudTime`

2. `pencil_remote`（Pencil 远端 MCP 占位）
- 需要你替换成真实地址和 token。
- 目前是模板：
  - `url`: `https://YOUR_PENCIL_MCP_ENDPOINT/sse`
  - `Authorization`: `Bearer YOUR_PENCIL_MCP_TOKEN`

---

## 3. 一次性配置步骤（按顺序）
1. 获取 Pencil MCP 服务地址和 API Token。
2. 打开 [.vscode/mcp.json](d:/Project_building/Clouddo1/CloudTime/.vscode/mcp.json)。
3. 替换这两项：
   - `YOUR_PENCIL_MCP_ENDPOINT`
   - `YOUR_PENCIL_MCP_TOKEN`
4. 重启 VS Code。
5. 在 MCP 面板检查 `filesystem_cloudo` 与 `pencil_remote` 是否都已连接。

---

## 4. 联通验证（最小验证集）
### 4.1 文件系统 MCP 验证
让 AI 执行：
- “列出 `src/components` 下的文件”
- “打开 `src/components/TimeManagerPage.tsx`”

若可返回文件列表与内容，`filesystem_cloudo` 正常。

### 4.2 Pencil MCP 验证
让 AI 执行：
- “列出当前可访问的 design 文件/画板”
- “读取某个页面的图层树”

若返回权限错误，多半是 token 或 endpoint 错。

---

## 5. 推荐工作流（设计 -> 代码）
1. 从 Pencil 拉设计上下文（页面、组件、图层、样式）。
2. 让 AI 先产出结构化映射：
   - 组件清单
   - 样式 token
   - 交互状态机
3. 再分两步生成代码：
   - 第一步：只改布局和视觉（不碰业务逻辑）
   - 第二步：接交互和数据逻辑
4. 每步都要求 AI 给出 diff + 验证命令。

---

## 6. 高质量提示词模板（可直接用）
### 6.1 设计对齐提示
```text
读取 Pencil 的 [页面名]，输出：
1) 组件树
2) 间距/字体/颜色 token
3) 交互状态（hover/active/disabled）
不要改代码，只给实施清单。
```

### 6.2 落地实现提示
```text
基于你刚才读取的 Pencil 设计，实现到 React 代码：
- 保持现有路由与状态结构
- 仅修改 [文件路径]
- 完成后给出 git diff 和测试命令
```

### 6.3 回归检查提示
```text
对比当前代码和 Pencil 设计，列出不一致项：
- 布局偏差
- 字体与字号偏差
- 颜色与对比度偏差
- 交互状态缺失
按严重程度排序。
```

---

## 7. 常见问题与排查
### 问题 1：`pencil_remote` 连不上
- 检查 endpoint 是否真的是 MCP SSE 地址。
- 检查 token 是否过期。
- 确认公司网络/代理未拦截。

### 问题 2：能连上但读不到文件
- 多为账号权限不足（项目未授权）。
- 检查设计库共享权限。

### 问题 3：AI 仍然“看不见设计”
- 确认 AI 当前会话已经挂载该 MCP server。
- 让 AI先执行一次“列出可用工具/资源”验证。

---

## 8. 安全与团队协作建议
- 不要把真实 token 提交到 git。
- 建议把 token 改为环境变量注入（团队统一规范）。
- 每次改 `.vscode/mcp.json` 前后记录变更原因。

---

## 9. 建议你下一步马上做的两件事
1. 先把 `.vscode/mcp.json` 里的 `pencil_remote` 地址和 token 替换成真实值并重启 VS Code。  
2. 用“联通验证”里的两条命令跑一遍，确认 MCP 已可读设计和代码。
