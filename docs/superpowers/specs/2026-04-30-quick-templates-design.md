# Quick Templates Page — Design

**Date:** 2026-04-30
**Author:** brainstorm session

## Problem

After completing an inspection, the user writes a report consisting of two parts:

1. A **General overall description**.
2. A **message to the tenant or landlord**.

Both parts have stable templates, but with variations:

- Inspection type (搬入 / 搬出 / 例行检查) changes the wording.
- If certain areas (bathroom, kitchen, …) are not clean, the cleanliness portion changes and a message is sent to the tenant.
- If items are damaged, a message is sent to the landlord.
- The General description has 4 small variants depending on whether cleanliness/damage issues exist.

Today the user copies different snippets from notes manually for each report. This is slow and error-prone. The new page must let the user **select conditions and copy the assembled text in one click**.

## Goals

- Pick inspection type → instantly see assembled text for General / Tenant / Landlord.
- Multi-select cleanliness areas and predefined damage items; allow free-text damage entries for the long tail.
- One-click copy per output box.
- All templates fully editable from the UI (no hardcoded strings, no JSON file edits).
- Persist templates in the backend (multi-device, durable).

## Non-Goals

- Auto-sending messages to anyone (this is copy-paste only).
- Linking templates to actual inspection records (no foreign keys to `InspectionTask` / `InspectionRecord`). The page is standalone.
- Replacing the existing `InspectionType` enum used by `InspectionTask` / `InspectionRecord`. Templates use their own user-manageable inspection-type table.

## Data Model

Five new PostgreSQL tables (Supabase), EF Core entities under `Backend/Models/`. Tables and seed rows are created on app startup via raw SQL in `Program.cs` (matching the existing `TaskTypes` pattern), using `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT DO NOTHING`. All names below are EF entity names.

### `TemplateInspectionType`

| Field | Type | Notes |
|---|---|---|
| `Id` | int (PK) | |
| `Name` | string(50) | e.g. "搬入" |
| `DisplayOrder` | int | UI sort order |

Seeded with 搬入 / 搬出 / 例行检查.

### `CleanlinessArea`

| Field | Type | Notes |
|---|---|---|
| `Id` | int (PK) | |
| `Name` | string(50) | e.g. "卫生间" |
| `DirtyText` | string(1000) | Snippet inserted when this area is selected as dirty |
| `DisplayOrder` | int | |

Seeded with 卫生间 / 厨房 / 卧室 / 客厅 / 阳台.

### `DamageItem`

| Field | Type | Notes |
|---|---|---|
| `Id` | int (PK) | |
| `Name` | string(50) | e.g. "灯坏了" |
| `Text` | string(1000) | Snippet inserted when selected |
| `DisplayOrder` | int | |

Seeded empty (user adds their own).

### `GeneralTemplate`

12 rows total (3 inspection types × 4 issue states).

| Field | Type | Notes |
|---|---|---|
| `Id` | int (PK) | |
| `InspectionTypeId` | int (FK → TemplateInspectionType) | |
| `HasCleanlinessIssue` | bool | |
| `HasDamageIssue` | bool | |
| `Text` | string(2000) | The whole General paragraph for this combination |

Unique index on `(InspectionTypeId, HasCleanlinessIssue, HasDamageIssue)`.

When a new `TemplateInspectionType` is added by the user, the backend auto-creates the 4 missing `GeneralTemplate` rows with empty text (so the user can fill them in).

### `AudienceTemplate`

Stores the tenant/landlord wrapper text per inspection type.

| Field | Type | Notes |
|---|---|---|
| `Id` | int (PK) | |
| `InspectionTypeId` | int (FK) | |
| `Audience` | enum (`Tenant`, `Landlord`) | |
| `NoIssueText` | string(2000) | Used when no items are checked |
| `IssuePrefix` | string(1000) | Goes before the concatenated snippets |
| `IssueSuffix` | string(1000) | Goes after |

For each inspection type there are 2 rows (one per audience). Auto-created when a new type is added.

## Assembly Logic (Pure Function)

A pure function `assemble(state, templates)` produces three strings.

```
state = {
  inspectionTypeId,
  selectedAreaIds: number[],
  selectedDamageItemIds: number[],
  customDamageEntries: string[],
}
```

```
hasCleanlinessIssue = selectedAreaIds.length > 0
hasDamageIssue     = selectedDamageItemIds.length > 0 || customDamageEntries.length > 0

generalText = GeneralTemplate.Text
  matching (inspectionTypeId, hasCleanlinessIssue, hasDamageIssue)

tenantTpl = AudienceTemplate where Audience=Tenant, InspectionTypeId=...
tenantText = hasCleanlinessIssue
  ? tenantTpl.IssuePrefix
    + selectedAreas.map(a => a.DirtyText).join("\n")
    + tenantTpl.IssueSuffix
  : tenantTpl.NoIssueText

landlordTpl = AudienceTemplate where Audience=Landlord, ...
landlordText = hasDamageIssue
  ? landlordTpl.IssuePrefix
    + selectedDamageItems.map(d => d.Text).join("\n")
    + customDamageEntries.join("\n")
    + landlordTpl.IssueSuffix
  : landlordTpl.NoIssueText
```

Joining with `\n` — the user's existing templates can include leading/trailing blank lines if they want extra spacing.

The function lives in `Frontend/src/utils/templateAssembly.ts` and is unit-testable independent of the UI.

## Backend API

New `TemplatesController` at `Backend/Controllers/TemplatesController.cs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/templates/all` | One-shot fetch of all 5 tables (frontend caches in memory) |
| POST | `/api/templates/inspection-types` | Create. Auto-creates 4 GeneralTemplate + 2 AudienceTemplate rows. |
| PUT | `/api/templates/inspection-types/{id}` | Rename / reorder |
| DELETE | `/api/templates/inspection-types/{id}` | Cascade-deletes related General/Audience rows |
| POST/PUT/DELETE | `/api/templates/cleanliness-areas[/{id}]` | CRUD |
| POST/PUT/DELETE | `/api/templates/damage-items[/{id}]` | CRUD |
| PUT | `/api/templates/general/{id}` | Update text only (rows are auto-managed) |
| PUT | `/api/templates/audience/{id}` | Update text only (rows are auto-managed) |

Tables are created and seeded by raw SQL added to `Program.cs` startup (matching the `TaskTypes` pattern). On every app boot the SQL runs as `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT DO NOTHING`, so it's idempotent. Defaults seeded: 3 inspection types (搬入/搬出/例行检查), 5 cleanliness areas (卫生间/厨房/卧室/客厅/阳台) with empty `DirtyText`, 12 GeneralTemplate rows with empty text, 6 AudienceTemplate rows with empty text.

## Frontend UI

New page `Frontend/src/pages/TemplatesPage.tsx`. Routed at `/templates`. Added to top navigation in [App.tsx](Frontend/src/App.tsx).

### Daily-use view (default)

```
┌─ 检查类型 ─────────────────────────────┐
│ ( 搬入 )  ( 搬出 )  ( 例行检查 )       │   ⚙ 管理模板
└─────────────────────────────────────────┘

┌─ General 整体描述 ───────────────────────┐
│  [assembled text — auto-updates]         │
│                                          │
│  [📋 复制]                                │
└──────────────────────────────────────────┘

┌─ 给房客（卫生）─────────┐  ┌─ 给房东（损坏）──────────┐
│ □ 卫生间                │  │ □ 灯坏了                  │
│ □ 厨房                  │  │ □ 水龙头漏水              │
│ □ 卧室                  │  │ ...                       │
│ □ 客厅                  │  │                           │
│ □ 阳台                  │  │ + 自定义损坏项：           │
│                         │  │ [____input____]  [+]      │
│                         │  │ • 已添加项 1   [×]        │
│                         │  │ • 已添加项 2   [×]        │
│ ┌─ 预览 ──────┐         │  │                           │
│ │  text…      │         │  │ ┌─ 预览 ──────┐           │
│ └─────────────┘         │  │ │  text…      │           │
│ [📋 复制]                │  │ └─────────────┘           │
└─────────────────────────┘  │ [📋 复制]                  │
                             └────────────────────────────┘
```

Behaviour:
- Selecting an inspection type does NOT reset checkboxes / custom entries (avoid losing work).
- Any state change re-runs `assemble()` and updates all three preview boxes.
- Copy button writes preview text to clipboard via `navigator.clipboard.writeText`. Button shows "已复制" for 1.5s.
- Custom damage entries are local UI state only — never persisted.

### Management view (modal or sub-page)

Triggered by ⚙ button. Four tabs:

1. **检查类型** — list with rename/reorder/add/delete.
2. **卫生区域** — list; clicking a row opens an inline editor for `Name` + `DirtyText`.
3. **损坏项目** — same pattern: `Name` + `Text`.
4. **整体描述 & 房客/房东包装语** — for each inspection type, a collapsible section showing 4 General textareas + 2 audience cards (Tenant / Landlord) each with `NoIssueText` / `IssuePrefix` / `IssueSuffix` textareas. Save-on-blur.

Reuses styles from [Frontend/src/components/shared.tsx](Frontend/src/components/shared.tsx).

### Data fetching

A `useTemplates()` hook (in `Frontend/src/hooks/useTemplates.ts`) calls `/api/templates/all` once on page mount and caches in React state. After any mutation in the management view, it refetches. No pagination — total row count is small (< 50 rows).

## Testing

- **Backend:** xUnit test verifying `TemplatesStartupSql.Sql` contains expected `CREATE TABLE IF NOT EXISTS` clauses and seed rows. (Mirrors existing `DatabaseStartupSqlTests` pattern — full controller integration tests are out of scope; the Frontend project has no test runner.)
- **Manual:** open the page, verify each copy button, switch between inspection types, edit a template in management view and confirm daily-use view picks it up. Add a custom inspection type and confirm the 4+2 child rows are auto-created.

## Open Questions Deferred

- Whether to integrate templates with actual inspection records (auto-fill report fields). Out of scope for v1.
- Whether the cleanliness-area `DirtyText` should vary per inspection type. Initial design: single shared snippet. If the user finds the wording awkward across types later, we can extend `CleanlinessArea` with per-type overrides.

## File Touch List

**New:**
- `Backend/Controllers/TemplatesController.cs`
- `Backend/Models/DTOs/TemplateDtos.cs`
- `Backend/Data/TemplatesStartupSql.cs` (the `CREATE TABLE` + seed SQL string)
- `Frontend/src/pages/TemplatesPage.tsx`
- `Frontend/src/components/TemplatesManager.tsx` (management modal)
- `Frontend/src/hooks/useTemplates.ts`
- `Frontend/src/utils/templateAssembly.ts`
- `Frontend/src/types/templates.ts` (TS types matching backend DTOs)
- `Backend.Tests/TemplateAssemblyTests.cs` (or split between assembly/controller as the plan dictates)

**Modified:**
- `Backend/Models/Entities.cs` — add 5 new entity classes.
- `Backend/Data/AppDbContext.cs` — add `DbSet`s + entity configuration.
- `Backend/Program.cs` — invoke `TemplatesStartupSql.Sql` during startup.
- `Backend/Data/DatabaseStartupSql.cs` — extend `IdentitySequenceSyncSql` to cover new tables.
- `Frontend/src/config/api.ts` — add `templates` endpoint.
- `Frontend/src/App.tsx` — register `/templates` route + nav link.

Frontend unit tests for `assemble()` are deferred — the Frontend project has no test runner installed yet, and adding vitest is out of scope for this feature. The function is small and tested manually via the browser; if it gets more complex later, set up vitest as its own task.
