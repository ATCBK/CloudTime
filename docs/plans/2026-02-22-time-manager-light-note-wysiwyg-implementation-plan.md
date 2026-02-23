# Time Manager Light Note WYSIWYG Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在时间管理页轻笔记区域实现轻量所见即所得编辑器，含旧数据迁移与安全粘贴过滤。

**Architecture:** 将迁移与清洗逻辑提取为纯函数模块并由 Vitest 驱动；页面组件只做命令触发、内容同步与存储桥接；样式层仅增量调整右栏与滚动条。

**Tech Stack:** React 18, TypeScript, Vitest, Vite

---

### Task 1: TDD 建立轻笔记 HTML 工具模块

**Files:**
- Create: `src/components/lightNoteRichText.test.ts`
- Create: `src/components/lightNoteRichText.ts`

**Step 1: Write the failing test**
- 覆盖：
  - Markdown 旧值转基础 HTML
  - 危险标签与事件属性清洗
  - 链接协议白名单
  - 初始化回退逻辑

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 实现：`markdownToBasicHtml`、`sanitizeLightNoteHtml`、`resolveInitialLightNoteHtml`

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: PASS

### Task 2: 接入 TimeManager 右栏 WYSIWYG

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`

**Step 1: Write the failing test**
- 在 `lightNoteRichText.test.ts` 增加链接/清洗边界用例，确保接入所需能力存在。

**Step 2: Run test to verify it fails**
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
- 右栏编辑区改为 `contentEditable`
- 增加 B/I/列表/链接图标按钮
- 新增本地键 `cloudo.time.lightNoteHtml`
- 从旧键 `cloudo.time.lightNote` 一次性迁移
- 粘贴过滤与实时保存

**Step 4: Run test to verify it passes**
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: PASS

### Task 3: 样式与滚动条优化

**Files:**
- Modify: `src/styles.css`

**Step 1: Write the failing test**
- 无 UI 自动化，使用类型检查作为保护。

**Step 2: Run checks before implementation**
Run: `npm run typecheck`
Expected: PASS

**Step 3: Write minimal implementation**
- 右栏工具栏图标按钮样式
- WYSIWYG 编辑区与预览区样式
- 细胶囊滚动条样式（light note scope）

**Step 4: Run checks**
Run: `npm run typecheck`
Expected: PASS

### Task 4: 最终验证

**Files:**
- Modify: `src/components/TimeManagerPage.tsx`
- Modify: `src/styles.css`
- Create: `src/components/lightNoteRichText.ts`
- Create: `src/components/lightNoteRichText.test.ts`

**Step 1: Verify tests**
Run: `npm run test -- src/components/lightNoteRichText.test.ts`
Expected: PASS

**Step 2: Verify typecheck**
Run: `npm run typecheck`
Expected: PASS
