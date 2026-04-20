# Inspect Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first `/inspect` page that lists today + overdue inspection tasks, each with an auto-saving notes textarea, so the user can jot field observations while on-site.

**Architecture:** Single new React page (`InspectPage.tsx`) reusing the existing `useTasks` hook for data. Auto-save hits the existing `PUT /api/inspectiontasks/{id}` endpoint via direct `axios.put` (bypassing `useTasks.updateInspectionTask` to avoid its success toast + full-list refetch on every keystroke). No backend, database, or new API work.

**Tech Stack:** React 19, TypeScript, Ant Design 6, dayjs, axios, react-router-dom 7, Vite.

**Testing note:** The Frontend has no test framework installed (no `vitest`/`jest`; `package.json` scripts are `dev`/`build`/`lint`/`preview` only). Per the spec, we do NOT introduce test infrastructure for this feature. Each task is verified via `npm run lint`, `npm run build`, and scripted manual verification in the browser.

**Reference spec:** `docs/superpowers/specs/2026-04-20-inspect-board-design.md`

---

## File Structure

**Create:**
- `Frontend/src/pages/InspectPage.tsx` — the new page. Contains the page component and an internal `InspectCard` sub-component. Single file because both components are small, share types, and only this page uses them.

**Modify:**
- `Frontend/src/App.tsx` — add `import InspectPage`, add menu item (key `'6'`, between Tasks and Calendar in the items array), add `<Route>`, extend `selectedKey` memo.

**Do not modify:**
- Any backend file
- `Frontend/src/hooks/useTasks.ts` (we intentionally call `axios.put` directly for silent saves)
- `Frontend/src/types/api.ts` (all types already exist)

---

## Task 1: Scaffold empty InspectPage and wire up route + menu

**Goal:** Navigating to `/inspect` renders a placeholder page; menu item highlights correctly. No data wiring yet.

**Files:**
- Create: `Frontend/src/pages/InspectPage.tsx`
- Modify: `Frontend/src/App.tsx` (imports, menu items, Routes, selectedKey memo)

- [ ] **Step 1: Create placeholder InspectPage**

Create `Frontend/src/pages/InspectPage.tsx` with exactly this content:

```tsx
import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const InspectPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>
      <p>Placeholder — wiring check.</p>
    </div>
  );
};

export default InspectPage;
```

- [ ] **Step 2: Add import to App.tsx**

In `Frontend/src/App.tsx`, add after the existing page imports (after the `ConfigPage` import line, around line 17):

```tsx
import InspectPage from './pages/InspectPage';
```

- [ ] **Step 3: Add EditOutlined icon import**

In `Frontend/src/App.tsx`, modify the `@ant-design/icons` import block (currently lines 3-9) to include `EditOutlined`:

```tsx
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons';
```

- [ ] **Step 4: Extend selectedKey memo**

In `Frontend/src/App.tsx`, modify the `selectedKey` memo (currently lines 25-31) to add the `/inspect` branch **before** the fallback `return '1'`:

```tsx
const selectedKey = useMemo(() => {
  if (location.pathname === '/tasks') return '2';
  if (location.pathname === '/inspect') return '6';
  if (location.pathname === '/calendar') return '3';
  if (location.pathname === '/history') return '4';
  if (location.pathname === '/config') return '5';
  return '1';
}, [location.pathname]);
```

- [ ] **Step 5: Add menu item between Tasks and Calendar**

In `Frontend/src/App.tsx`, modify the `Menu items` array (currently lines 46-53) to insert the new entry between Tasks and Calendar:

```tsx
items={[
  { key: '1', icon: <HomeOutlined />,         label: <Link to="/">Properties</Link> },
  { key: '2', icon: <UnorderedListOutlined />, label: <Link to="/tasks">Tasks</Link> },
  { key: '6', icon: <EditOutlined />,          label: <Link to="/inspect">Inspect</Link> },
  { key: '3', icon: <CalendarOutlined />,      label: <Link to="/calendar">Calendar</Link> },
  { key: '4', icon: <FileTextOutlined />,      label: <Link to="/history">History</Link> },
  { key: '5', icon: <SettingOutlined />,       label: <Link to="/config">Config</Link> },
]}
```

- [ ] **Step 6: Add route**

In `Frontend/src/App.tsx`, modify the `<Routes>` block (currently lines 94-100) to add the `/inspect` route (order does not matter, but keep it adjacent to `/tasks` for readability):

```tsx
<Routes>
  <Route path="/" element={<PropertiesPage />} />
  <Route path="/tasks" element={<TasksPage />} />
  <Route path="/inspect" element={<InspectPage />} />
  <Route path="/calendar" element={<CalendarPage />} />
  <Route path="/history" element={<HistoryPage />} />
  <Route path="/config" element={<ConfigPage />} />
</Routes>
```

- [ ] **Step 7: Lint and build**

Run from `Frontend/`:

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both succeed (no new errors). If lint complains about unused imports in App.tsx, re-check Step 3.

- [ ] **Step 8: Manual verification**

Start the dev server (`cd Frontend && npm run dev`), open the reported localhost URL, and verify:
- Sidebar shows "Inspect" between "Tasks" and "Calendar" with a pencil icon
- Clicking "Inspect" navigates to `/inspect`, highlights the menu item, and renders "Placeholder — wiring check."
- Refreshing on `/inspect` still highlights the correct menu item

- [ ] **Step 9: Commit**

```bash
git add Frontend/src/pages/InspectPage.tsx Frontend/src/App.tsx
git commit -m "feat: scaffold /inspect route and menu entry"
```

---

## Task 2: Render task list (date tag + address) from useTasks

**Goal:** `/inspect` shows a list of today + overdue inspection tasks, each with date and address. No textarea / no save yet.

**Files:**
- Modify: `Frontend/src/pages/InspectPage.tsx` (replace placeholder with real listing)

- [ ] **Step 1: Rewrite InspectPage to render the task list**

Overwrite `Frontend/src/pages/InspectPage.tsx` with:

```tsx
import React, { useMemo } from 'react';
import { Card, Tag, Typography, Spin, Empty } from 'antd';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import type { CombinedTask } from '../types/api';

const { Text, Title } = Typography;

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
}

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue }) => {
  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text strong style={{ fontSize: 16, display: 'block' }}>
        {task.propertyAddress ?? '(no address)'}
      </Text>
    </Card>
  );
};

const InspectPage: React.FC = () => {
  const { overdueTasks, todayTasks, loading } = useTasks();

  const items = useMemo(() => {
    const overdue = overdueTasks.map(t => ({ task: t, isOverdue: true }));
    const today = todayTasks.map(t => ({ task: t, isOverdue: false }));
    return [...overdue, ...today].sort((a, b) => {
      const da = a.task.scheduledAt ? dayjs(a.task.scheduledAt).valueOf() : 0;
      const db = b.task.scheduledAt ? dayjs(b.task.scheduledAt).valueOf() : 0;
      return da - db;
    });
  }, [overdueTasks, todayTasks]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 4px' }}>
      <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>

      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty description="今天没有需要检查的任务" style={{ marginTop: 48 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(({ task, isOverdue }) => (
            <InspectCard key={task.id} task={task} isOverdue={isOverdue} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InspectPage;
```

- [ ] **Step 2: Lint and build**

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both succeed.

- [ ] **Step 3: Manual verification**

Dev server running, visit `/inspect`:
- If there are existing today/overdue tasks in your DB: each renders as a card showing `MM-DD` tag + address; overdue ones show a red tag and "Overdue" label
- If none: shows "今天没有需要检查的任务" empty state
- Create a task in TasksPage scheduled today, return to `/inspect`: it appears (you may need to navigate back to `/inspect` since `useTasks` re-fetches on mount)
- Cards sort ascending by scheduled date (oldest overdue first, then today)

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/pages/InspectPage.tsx
git commit -m "feat(inspect): render today + overdue tasks with date and address"
```

---

## Task 3: Add TextArea with local state (no save yet)

**Goal:** Each card shows a TextArea pre-filled with `task.notes`. Edits update local state only; nothing is sent to the server yet. This isolates UI work from save logic.

**Files:**
- Modify: `Frontend/src/pages/InspectPage.tsx`

- [ ] **Step 1: Add TextArea to InspectCard**

In `Frontend/src/pages/InspectPage.tsx`, replace the existing `InspectCard` component with:

```tsx
import { Input } from 'antd';
// ...existing imports remain; ensure Input is added to the antd import line

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
}

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue }) => {
  const [notes, setNotes] = React.useState<string>(task.notes ?? '');
  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
        {task.propertyAddress ?? '(no address)'}
      </Text>
      <Input.TextArea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        autoSize={{ minRows: 4, maxRows: 10 }}
        maxLength={500}
        showCount
        placeholder="记录检查情况…"
      />
    </Card>
  );
};
```

Also update the antd import at the top of the file to include `Input`:

```tsx
import { Card, Tag, Typography, Spin, Empty, Input } from 'antd';
```

- [ ] **Step 2: Lint and build**

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both succeed.

- [ ] **Step 3: Manual verification**

- Each card shows a 4-row auto-expanding TextArea with character count `N / 500`
- Typing updates the textarea content; counter advances
- Leaving and returning to `/inspect` resets local notes back to server value (because component remounts and re-seeds from `task.notes`) — this is expected at this stage; Task 4 adds persistence
- Cannot type beyond 500 characters

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/pages/InspectPage.tsx
git commit -m "feat(inspect): add note textarea with local state per card"
```

---

## Task 4: Add debounced auto-save + status indicator

**Goal:** Edits persist to the backend. Status indicator shows `saving` / `saved` / `error` at the bottom of each card. Errors are recoverable via a retry link. We bypass `useTasks.updateInspectionTask` to avoid its success toast and full-list refetch on every keystroke.

**Files:**
- Modify: `Frontend/src/pages/InspectPage.tsx`

- [ ] **Step 1: Add save logic to InspectCard**

In `Frontend/src/pages/InspectPage.tsx`, replace the `InspectCard` component with the version below. Also extend the imports at the top of the file as noted.

Top-of-file imports become:

```tsx
import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Card, Tag, Typography, Spin, Empty, Input } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { useTasks } from '../hooks/useTasks';
import { API_ENDPOINTS } from '../config/api';
import type { CombinedTask, InspectionType, InspectionTaskUpdateRequest } from '../types/api';
```

`InspectCard` becomes:

```tsx
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface InspectCardProps {
  task: CombinedTask;
  isOverdue: boolean;
}

const DEBOUNCE_MS = 800;
const SAVED_CLEAR_MS = 3000;

const InspectCard: React.FC<InspectCardProps> = ({ task, isOverdue }) => {
  const [notes, setNotes] = useState<string>(task.notes ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef<string>(task.notes ?? '');
  const lastSavedRef = useRef<string>(task.notes ?? '');

  const save = useCallback(async (value: string) => {
    if (value === lastSavedRef.current) {
      return;
    }
    setStatus('saving');
    const payload: InspectionTaskUpdateRequest = {
      propertyId: task.propertyId!,
      scheduledAt: task.scheduledAt,
      notes: value,
      type: (task.type ?? 0) as InspectionType,
      isBillable: task.isBillable ?? false,
    };
    try {
      await axios.put(`${API_ENDPOINTS.inspectionTasks}/${task.id}`, payload);
      lastSavedRef.current = value;
      setStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setStatus('idle'), SAVED_CLEAR_MS);
    } catch {
      setStatus('error');
    }
  }, [task.id, task.propertyId, task.scheduledAt, task.type, task.isBillable]);

  const scheduleSave = useCallback((value: string) => {
    latestNotesRef.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      save(value);
    }, DEBOUNCE_MS);
  }, [save]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        if (latestNotesRef.current !== lastSavedRef.current) {
          save(latestNotesRef.current);
        }
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [save]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setNotes(v);
    scheduleSave(v);
  };

  const handleRetry = () => {
    save(latestNotesRef.current);
  };

  const dateLabel = task.scheduledAt ? dayjs(task.scheduledAt).format('MM-DD') : '';

  return (
    <Card size="small" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={isOverdue ? 'error' : undefined} style={{ margin: 0 }}>
          {dateLabel}
        </Tag>
        {isOverdue && <Text type="secondary" style={{ fontSize: 12 }}>Overdue</Text>}
      </div>
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
        {task.propertyAddress ?? '(no address)'}
      </Text>
      <Input.TextArea
        value={notes}
        onChange={handleChange}
        autoSize={{ minRows: 4, maxRows: 10 }}
        maxLength={500}
        showCount
        placeholder="记录检查情况…"
      />
      <div style={{ marginTop: 6, minHeight: 18, fontSize: 12, textAlign: 'right' }}>
        {status === 'saving' && <Text type="secondary">保存中…</Text>}
        {status === 'saved' && <Text type="success">已保存 ✓</Text>}
        {status === 'error' && (
          <>
            <Text type="danger">保存失败 </Text>
            <a onClick={handleRetry}>重试</a>
          </>
        )}
      </div>
    </Card>
  );
};
```

Note: the outer `InspectPage` component does not change in this task.

- [ ] **Step 2: Lint and build**

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both succeed. If you get an unused-import warning, remove the unused one.

- [ ] **Step 3: Manual verification — happy path**

Start backend (`scripts/` has a helper) and frontend dev server, then:
- Open `/inspect` with at least one today-or-overdue task
- Type in a card's textarea. After ~800 ms, bottom-right shows "保存中…" briefly, then "已保存 ✓" (fades after 3 s)
- Reload the page — your note persists
- Type quickly: only a single request should be sent after you stop (verify in DevTools Network — filter by `inspectiontasks`)
- Navigate to `/tasks`: the note shows on the task there (Tasks page calls `fetchTasks` on mount)

- [ ] **Step 4: Manual verification — error path**

- In DevTools → Network, enable "Offline" throttling
- Type in a textarea; after debounce, status shows "保存失败 重试"
- Turn Offline off, click "重试"; status becomes "已保存 ✓"

- [ ] **Step 5: Manual verification — unmount flush**

- Type a change
- Within 800 ms, click a different sidebar item (forcing the card to unmount)
- Come back to `/inspect` — the edit should be present (the unmount effect flushes the pending save)

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/pages/InspectPage.tsx
git commit -m "feat(inspect): debounced auto-save with status indicator and retry"
```

---

## Task 5: Responsive layout polish and address copy-on-click

**Goal:** Cards feel right on mobile (tight padding, large tap targets); tapping an address copies it to clipboard.

**Files:**
- Modify: `Frontend/src/pages/InspectPage.tsx`

- [ ] **Step 1: Add copy-on-click to the address**

In `Frontend/src/pages/InspectPage.tsx`, update the antd import at the top of the file to include `message`:

```tsx
import { Card, Tag, Typography, Spin, Empty, Input, message } from 'antd';
```

Then replace the address `<Text>` line inside `InspectCard` with:

```tsx
<Text
  strong
  style={{ fontSize: 16, display: 'block', marginBottom: 8, cursor: 'pointer' }}
  onClick={async () => {
    const addr = task.propertyAddress;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      message.success('地址已复制');
    } catch {
      message.error('复制失败');
    }
  }}
>
  {task.propertyAddress ?? '(no address)'}
</Text>
```

- [ ] **Step 2: Tighten the page container padding on small screens**

In `Frontend/src/pages/InspectPage.tsx`, replace the outer wrapper `<div>` of `InspectPage` with a className-based wrapper:

```tsx
return (
  <div className="inspect-page">
    <Title level={4} style={{ marginTop: 0 }}>Inspect</Title>
    {/* ...rest unchanged */}
  </div>
);
```

Then add a `<style>` block at the bottom of the file, **before** the `export default`:

```tsx
const styles = `
  .inspect-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 4px;
  }
  @media (max-width: 768px) {
    .inspect-page {
      padding: 0;
    }
  }
`;

// Inject styles once on module load
if (typeof document !== 'undefined' && !document.getElementById('inspect-page-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'inspect-page-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
```

(Rationale: this project does not use CSS modules or styled-components for page styles; `App.css` is global. Using a one-shot injected style block keeps all Inspect-specific CSS co-located with the page without touching the global stylesheet.)

- [ ] **Step 3: Lint and build**

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both succeed.

- [ ] **Step 4: Manual verification — desktop**

- On desktop Chrome: list is centered, max 720 px wide; cards look identical to before
- Click an address: toast "地址已复制" appears; paste elsewhere confirms the address was copied

- [ ] **Step 5: Manual verification — mobile**

Use Chrome DevTools device emulator (e.g., iPhone 14):
- List is full width with no left/right padding
- Address font size is readable (16 px); tapping it copies
- TextArea is full width; on-screen keyboard does not obscure the status indicator (status sits above the card's bottom edge)
- Sidebar collapses (breakpoint="lg" already configured in App.tsx); opening it and tapping Inspect navigates correctly

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/pages/InspectPage.tsx
git commit -m "feat(inspect): copy address on click, tighten mobile padding"
```

---

## Task 6: Final QA pass

**Goal:** Walk through the full spec verification checklist; fix any regressions.

**Files:** (none created; verification only)

- [ ] **Step 1: Run lint and build one final time**

```bash
cd Frontend && npm run lint && npm run build
```

Expected: both clean.

- [ ] **Step 2: Walk the spec verification checklist**

Reference: `docs/superpowers/specs/2026-04-20-inspect-board-design.md` §7.

- [ ] Desktop Chrome: today + overdue tasks render, sorted ascending
- [ ] Chrome DevTools iPhone emulation: single column, full width, large tap targets
- [ ] ≥ 800 ms after typing → "已保存 ✓"
- [ ] Rapid typing → only one request sent (verify in Network panel)
- [ ] Offline → "保存失败 重试"; reconnect + retry → success
- [ ] Navigate to Tasks page → Notes persisted
- [ ] Delete all today/overdue tasks → Empty state shows
- [ ] Tap address → clipboard copy succeeds

- [ ] **Step 3: Fix any issues found**

If any check fails, fix the issue in `InspectPage.tsx`, re-run lint/build, and re-verify only the failed check. Commit each fix separately with a descriptive message.

- [ ] **Step 4: Final commit (only if fixes were made)**

```bash
git add Frontend/src/pages/InspectPage.tsx
git commit -m "fix(inspect): <specific fix description>"
```

If no fixes were needed, no commit required — the feature is done.

---

## Spec Coverage Map

| Spec section | Implemented in |
|---|---|
| §3 Data Model — use existing `InspectionTask.Notes` | Task 4 (payload uses existing fields) |
| §4 User Flow — list + textarea + auto-save feedback | Tasks 2, 3, 4 |
| §5.1 Routing & Navigation | Task 1 |
| §5.2 Page Component (reuse `useTasks`, no new hook) | Tasks 2, 4 |
| §5.3 Auto-save (800 ms debounce, status, unmount flush) | Task 4 |
| §5.4 Responsive layout (720 px cap, mobile padding) | Tasks 2, 5 |
| §5.5 UI Details (date tag, address copy, textarea, status) | Tasks 2, 3, 4, 5 |
| §5.6 Empty State | Task 2 |
| §5.7 Loading State (Spin on first load) | Task 2 |
| §6 Error Handling (silent fail, retry, no Modal) | Task 4 |
| §7 Testing (manual checklist) | Task 6 |
