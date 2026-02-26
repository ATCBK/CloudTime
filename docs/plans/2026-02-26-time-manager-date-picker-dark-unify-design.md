# Time Manager Date Picker + Dark Unify Design

**Date:** 2026-02-26
**Status:** Approved
**Owner:** Codex + User

---

## 1. Goal

在时间管理页完成两项改进：

1. 日视图中将“当前日期”只读占位改为可直接选择任意日期的原生日期选择器，支持未来任务规划。
2. 统一周视图与月视图在暗夜模式下的视觉层级，避免出现浅色块和文字对比不一致。

---

## 2. Scope

### In Scope

- `TimeManagerPage` 中日视图标题区日期展示改为 `<input type="date">`。
- 周/月视图关键样式改为 Time Manager 专用变量驱动。
- 在暗夜主题下为这些变量提供统一映射。

### Out of Scope

- 不改动任务数据模型与存储结构。
- 不改动“0点自动回到今天”的现有行为。
- 不做整页样式重构或拆分文件。

---

## 3. UX Decisions

### Date Interaction

- 采用“仅日期选择器”交互。
- 用户可在日视图中直接选择任意未来日期。
- 选择日期后，现有 `selectedDateKey` 继续作为唯一选中日期状态。

### Dark Consistency

- 周/月相关面板、卡片、边框、辅助文案统一使用 Time Manager token。
- 通过变量映射统一 light/dark，而不是散落硬编码颜色。

---

## 4. Architecture & Data Flow

1. `selectedDateKey` 继续作为全局选中日期状态（现有逻辑保留）。
2. 日视图标题右侧的日期控件：
   - `value = selectedDateKey`
   - `onChange => setSelectedDateKey(nextDateKey)`
3. 周视图和月视图依赖 `selectedDate` 计算逻辑自动响应变化（现有逻辑复用）。
4. `currentDateKey` 仅用于“now-line 是否显示”判断，避免和用户所选未来日期混淆。

---

## 5. Styling Strategy (Scheme B)

在 `styles.css` 的 Time Manager 区域引入/整理并使用以下变量：

- `--tm-surface`
- `--tm-surface-soft`
- `--tm-border`
- `--tm-text`
- `--tm-text-muted`

### Light Mapping

- 与当前浅色视觉接近，避免引入观感回归。

### Dark Mapping

- 映射到现有 Time Manager dark 基调（`#252526 / #2d2d30 / #3c3c3c / #d4d4d4`）。

### Target Selectors

- `.week-cell`, `.month-cell`, `.week-item`
- `.week-expanded-day`, `.week-expanded-row`, `.week-expanded-row span`, `.week-expanded-card`
- `.week-date-btn.active`, `.month-cell.muted`（保留 muted 透明语义，文本走变量）

---

## 6. Error Handling & Validation

- 日期输入只在合法 `YYYY-MM-DD` 值时更新状态。
- 不新增异常提示流程，保持原生日期控件行为。

---

## 7. Test & Acceptance

### Functional Acceptance

1. 日视图可选择任意未来日期，并能在该日期创建/拖拽任务。
2. 切换到周视图和月视图后，所选日期对应内容正确刷新。
3. 暗夜模式下周/月视图与日视图色阶一致，无突兀浅色卡片。

### Automated Test Target

- 补一个组件行为测试：日期输入变更后，`selectedDateKey` 驱动展示日期变化。

---

## 8. Risks

- 风险：`styles.css` 历史覆盖层较多，容易被后续选择器覆盖。
- 缓解：将周/月改动收敛到 `.time-manager-page` 语义域并集中使用 token。

---

## 9. Rollout Plan

1. 先改日期交互与测试。
2. 再做周/月 token 化与 dark 统一。
3. 跑测试与手工验收后提交。

