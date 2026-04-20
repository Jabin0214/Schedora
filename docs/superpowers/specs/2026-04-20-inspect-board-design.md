# Inspect Board — 现场检查记录页设计

**Date:** 2026-04-20
**Status:** Approved by user; ready for implementation plan
**Author:** Jabin + Claude

## 1. Purpose

用户外出做物业检查时，需要在手机上快速为今天和逾期的检查任务记录简短评价。现有 Tasks 页面功能完整但信息密度高、不适合单手现场操作。本页做为**纯记录板**，只聚焦"看地址 + 写笔记"两件事。

## 2. Non-goals

- 不包含"完成检查"操作（仍在 Tasks 页完成）
- 不支持照片、附件、离线缓存
- 不做筛选、搜索、排序选项
- 不新增数据表

## 3. Data Model

**No schema changes.**

记录直接写入现有 `InspectionTask.Notes` 字段（`StringLength(500)`，保持不变）。任务被完成或删除时，笔记随之消失——用户已确认接受。

## 4. User Flow

1. 用户在手机浏览器打开 `/inspect`
2. 页面按日期升序列出「逾期 + 今天」所有未完成任务
3. 每条任务显示日期（`MM-DD`）、地址、多行文本框
4. 用户在文本框输入评价，800 ms 防抖后自动 PUT 到后端
5. 状态反馈在卡片右下角：`saving` / `saved` / `error + retry`
6. 用户关闭页面即可；完成检查走 Tasks 页的既有流程

## 5. Architecture

### 5.1 Routing & Navigation

- `Frontend/src/App.tsx`
  - 新增 `<Route path="/inspect" element={<InspectPage />} />`
  - 侧边栏菜单 `items` 数组里新增一项，`key = '6'`，**在数组中排在 Tasks 之后、Calendar 之前**（菜单位置由数组顺序决定，key 只是标识符，现有 2–5 的 key 保持不变）
  - 图标：`EditOutlined`（from `@ant-design/icons`）
  - Label: `Inspect`
  - `selectedKey` 逻辑加一条 `location.pathname === '/inspect' → '6'`

### 5.2 Page Component

**File:** `Frontend/src/pages/InspectPage.tsx`

```
InspectPage
├── header (page title + count)
├── Empty state (when no tasks)
└── list
    └── InspectCard (per task)  ← internal component in same file
        ├── DateTag (overdue red / today default)
        ├── Address (copy on click)
        ├── TextArea (autosize, maxLength 500)
        └── SaveStatus (saving | saved | error)
```

无新增 hook。复用 `useTasks()`：

```ts
const { overdueTasks, todayTasks, updateInspectionTask, loading } = useTasks();
const items = useMemo(
  () => [...overdueTasks, ...todayTasks].sort(byScheduledAtAsc),
  [overdueTasks, todayTasks]
);
```

### 5.3 Auto-save

- 每个 `InspectCard` 维护本地 `notes` state 和 `status` state（`idle | saving | saved | error`）
- `onChange` 更新本地 state，同时触发 800 ms 防抖的 save
- 保存时：`PUT /api/inspectiontasks/{id}`，DTO 字段全部带上（`PropertyId` / `ScheduledAt` / `Type` / `IsBillable` / `Notes`）→ 复用 `updateInspectionTask`
- 成功 → `saved`（3 秒后回到 `idle`）
- 失败 → `error`，卡片显示"保存失败"+ 重试按钮（点一下重新发送最新 notes）
- 组件卸载时 flush 最后一次 pending（`useEffect` 清理函数）
- 离开页面时浏览器原生 `beforeunload` 不做处理（用户已容忍丢最后 <800 ms 输入）

### 5.4 Responsive Layout

容器：

```css
.inspect-list {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

卡片（AntD `Card`，`size="small"`）：

| Breakpoint | 行为 |
|---|---|
| `< 768px` (mobile) | 全宽；地址 `font-size: 16px`；TextArea `minRows: 4` |
| `≥ 768px` | 列表居中 720px 上限；地址 `font-size: 15px` |

App.tsx 的 `Content` 容器目前 `padding: 24`；移动端体验上略挤，本页用内层容器覆盖 padding 为 `12px`（通过行内 style，不改 App.tsx）。

### 5.5 UI Details

- **日期标签**：逾期 → `<Tag color="error">MM-DD</Tag>`；今天 → `<Tag>MM-DD</Tag>`；无 `ScheduledAt` 的任务**不在本页展示**（本页仅今天 + 逾期，都有日期）
- **地址**：`<Text>{address}</Text>`；长按 / 点击复制用 `navigator.clipboard.writeText` + AntD `message.success('已复制')`
- **TextArea**：`autoSize={{ minRows: 4, maxRows: 10 }}`，`maxLength={500}`，`showCount`
- **状态指示**：卡片右下角小字 `12px`
  - `saving` → 灰色 "保存中…"
  - `saved` → 绿色 "已保存 ✓"（用 AntD `colorSuccess`）
  - `error` → 红色 "保存失败" + `<a>` 重试

### 5.6 Empty State

无任何今天 / 逾期任务 → `<Empty description="今天没有需要检查的任务" />`

### 5.7 Loading State

首次加载用 AntD `Spin` 居中覆盖；保存过程不用全屏 Loading。

## 6. Error Handling

| 场景 | 处理 |
|---|---|
| GET 任务失败 | `useTasks` 已有 message.error；本页照旧 |
| PUT Notes 失败（网络/500） | 卡片显示红字 + 重试；不弹 Modal |
| 500 字符超限 | `maxLength` 前端拦截；不会到后端 |
| 任务在别处被删除 | PUT 返回 404 → 状态改为 `error`，文字改为"任务已不存在"，无重试按钮 |

## 7. Testing

项目目前无前端测试基建（仓库里未见测试目录与配置），本页也不先引入。

人工验证清单：
- [ ] 桌面 Chrome：今天 + 逾期任务正确显示并按日期排序
- [ ] 手机 Safari（或 Chrome DevTools 移动模拟）：布局单列全宽，TextArea 可输入
- [ ] 输入后 ≥ 800 ms 自动出现"已保存"
- [ ] 快速连续输入只发一次请求（防抖生效）
- [ ] 断网输入 → 显示错误 + 重试；恢复网络点重试成功
- [ ] 切回 Tasks 页看到 Notes 已持久化
- [ ] 空状态：删光所有今天/逾期任务后显示 Empty
- [ ] 地址点击复制成功

## 8. Files Changed

**Modified:**
- `Frontend/src/App.tsx` — 菜单 + 路由各加一条
- `Frontend/src/pages/` — 新增 `InspectPage.tsx`

**Not modified:**
- 后端、数据库、hooks、types 均无改动

## 9. Out of Scope / Future Ideas

- 照片上传（需要存储方案、后端改动）
- 离线草稿（IndexedDB / Service Worker）
- "完成检查"按钮（现场一次完成流程）
- 多人协作时的笔记冲突解决

这些都**不在本次实现范围内**；如未来需要再单独设计。
