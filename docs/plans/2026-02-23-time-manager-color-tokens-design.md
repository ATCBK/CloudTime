# 时间管理页配色 Token 化（Design）

## 目标

仅在时间管理页替换配色，使用指定色板并保持其它页面不受影响。

## 指定色板

- `--brand-blue: #10246C`
- `--brand-yellow: #FFD700`
- `--bg-sky: #E0F2FF`
- `--bg-panel: #FFFFFF`
- `--status-success: #34D399`
- `--status-error: #F87171`

## 方案

采用 scoped token：只在 `.time-manager-shell` 下声明上述变量，并把 `.time-manager-shell` 与 `.time-manager-page` 作用域中的硬编码蓝灰色替换成 token 引用。

## 交互与视觉重点

- 主导航、标题、主要操作按钮使用 `--brand-blue`。
- 当前时间相关强调（now line / badge）使用 `--brand-yellow`。
- 页面底与面板底分别使用 `--bg-sky`、`--bg-panel`。
- 完成/正常状态使用 `--status-success`，危险/删除交互使用 `--status-error`。

## 验收

- 时间管理页整体配色按新 token 生效。
- 笔记页、设置页视觉不变。
- 无类型错误，测试通过。

