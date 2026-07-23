# Schedora Development Guide

This guide captures the current project conventions so future changes can land without rediscovering the same edges.

## Architecture

- `Backend/` is an ASP.NET Core Web API on .NET 9.
- `Frontend/` is a React 19 + TypeScript + Vite application.
- `Frontend` builds into `Backend/wwwroot`, and the backend serves the built SPA in single-entrypoint mode.
- PostgreSQL is the production database. Some tables are maintained through startup SQL because the deployed database may need incremental repair without running EF migrations manually.

## Local Run Modes

### Backend plus built frontend

```bash
cd Frontend
npm install
npm run build

cd ../Backend
dotnet restore
dotnet run --launch-profile http
```

Open `http://localhost:5097`.

### Vite development

```bash
cd Backend
dotnet watch run --launch-profile http
```

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Checks

Run both before pushing:

```bash
dotnet test Backend.Tests/Backend.Tests.csproj
cd Frontend
npm run build
```

Notes:

- `npm run build` updates `Backend/wwwroot`.
- Vite may warn that the main chunk is larger than 500 kB. That is currently expected and does not fail the build.

## Database Startup Conventions

`Backend/Program.cs` runs database startup SQL after confirming the database connection.

Use startup SQL for small additive compatibility changes that must be safe against an existing production database, for example:

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- sequence synchronization for identity columns

Keep startup SQL idempotent. It must be safe to run on every boot.

EF migrations still exist in `Backend/Migrations`. When changing EF model shape, check whether the production deployment path expects a migration, startup SQL, or both.

## Tenant Contacts

Tenant contacts are child records under `Property`.

Core backend files:

- `Backend/Models/Entities.cs`
- `Backend/Data/AppDbContext.cs`
- `Backend/Data/DatabaseStartupSql.cs`
- `Backend/Services/TenantContactImportService.cs`
- `Backend/Controllers/TenantContactsController.cs`
- `Backend/Models/DTOs/TenantContactDtos.cs`

Core frontend files:

- `Frontend/src/pages/TenantContactsPage.tsx`
- `Frontend/src/pages/PropertyDetailsPage.tsx`
- `Frontend/src/pages/PropertiesPage.tsx`
- `Frontend/src/types/api.ts`
- `Frontend/src/config/api.ts`

Import rules:

- Import only Palace CSV files with a `Property Address Full` header.
- Match to `Properties` by normalized exact address.
- Do not fuzzy-match addresses automatically. Similar unit numbers can be different properties.
- Supported email columns are `Tenant Group Email`, `Tenant Email 1`, and `Email`.
- Supported lease-end column is `Tenant Group Lease Date Ended`.
- Skip rows with no phone and no email.
- Deduplicate exact repeated contacts for the same property, phone, email, and lease-end value.
- `preview` must not write to the database.
- `import` replaces contacts only for properties matched in the uploaded CSV.

Useful endpoints:

- `GET /api/tenantcontacts`
- `GET /api/tenantcontacts/property/{propertyId}`
- `POST /api/tenantcontacts/preview`
- `POST /api/tenantcontacts/import`

## Property Information Page

Each property has a dedicated information page at:

```text
/properties/:id
```

It currently shows:

- property basics
- tenant contacts
- open tasks
- inspection records

Use this page as the place to add future per-property information rather than overloading the global property table.

## Inspection Notes

Inspection task notes no longer have the old 500-character validation limit. Keep long rough notes supported in:

- `InspectionTask`
- `InspectionTaskCreateDto`
- `InspectionTaskUpdateDto`
- frontend Inspect and Tasks flows

The Inspect page can complete a task in place through the existing inspection task completion API.

## AI Inspection Wording

`AiInspectionPromptBuilder` controls the model prompt for inspection note polishing.

The `englishGeneralText` output is expected to keep these exact labels:

- General Notes
- Overall Presentation
- Tenant Care
- Maintenance
- Risk Areas
- Assessment
- Specific Advice
- Tenant Tasks
- Owner Notifications

Update `Backend.Tests/AiInspectionPromptBuilderTests.cs` when changing this contract.

## Git Workflow

Default branch naming for Codex work:

```text
codex/<short-description>
```

Before committing:

1. Review `git status --short`.
2. Avoid staging unrelated user work.
3. Run backend tests.
4. Run frontend build.
5. Confirm `Backend/wwwroot` generated assets are included when the frontend changed.
