# Schedora — Property Inspection Management System

A modern, full-stack property inspection management system built with .NET 9.0 and React 19. Schedora helps property managers schedule, track, and archive inspection tasks with intelligent auto-billing and Google Workspace integration.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Pages Overview](#pages-overview)
- [Google Workspace Integration](#google-workspace-integration)
- [Billing Policies](#billing-policies)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## Features

- **Property Management** — Add, edit, and delete properties; assign billing policies per property
- **Inspection Task Scheduling** — Create and track move-in, move-out, routine, and ad-hoc inspection tasks
- **Task Completion Workflow** — Mark tasks complete and auto-archive them as inspection records
- **Inspection History** — View completed records with flexible date-range filtering
- **Auto-Billing** — Automatically determines chargeability based on each property's billing policy and inspection history
- **Google Calendar Sync** — Push upcoming tasks directly to Google Calendar
- **Google Sheets Export** — Export inspection data to Google Sheets for payroll and reporting
- **Daily Auto-Sync** — Background service that syncs data to Google Workspace at a configurable hour each day
- **Payroll Reports** — Generate two-week and custom payroll summaries

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|-----------|
| Framework | .NET 9.0 / ASP.NET Core Web API |
| ORM | Entity Framework Core 9.0 |
| Database | PostgreSQL (Supabase hosted) |
| API Docs | Swagger / OpenAPI |
| Google APIs | Google.Apis.Calendar.v3, Google.Apis.Sheets.v4, Google.Apis.Auth |

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | React 19.2.0 + TypeScript 5.9.3 |
| Build Tool | Vite 7.2.4 |
| UI Library | Ant Design 6.1.4 |
| Routing | React Router DOM 7.11.0 |
| HTTP Client | Axios 1.13.2 |
| Date Handling | Day.js 1.11.13 |

---

## Project Structure

```
Schedora/
├── Backend/                        # ASP.NET Core Web API
│   ├── Controllers/
│   │   ├── PropertiesController.cs
│   │   ├── InspectionTasksController.cs
│   │   ├── InspectionRecordsController.cs
│   │   ├── GoogleSyncController.cs
│   │   └── ReportsController.cs
│   ├── Models/
│   │   ├── Entities.cs             # Domain models
│   │   └── DTOs/                   # Data Transfer Objects
│   ├── Data/
│   │   └── AppDbContext.cs         # EF Core DB context with indexes & FK constraints
│   ├── Services/
│   │   ├── InspectionTaskService.cs
│   │   ├── GoogleSyncService.cs
│   │   ├── DailySyncBackgroundService.cs
│   │   └── ReportService.cs
│   ├── Migrations/
│   ├── Program.cs                  # App entry point, DI, CORS, middleware
│   ├── appsettings.json
│   └── InspectionApi.csproj
│
├── Frontend/                       # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PropertiesPage.tsx
│   │   │   ├── TasksPage.tsx
│   │   │   └── HistoryPage.tsx
│   │   ├── components/
│   │   │   ├── shared.tsx          # Shared styles & components
│   │   │   └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   ├── useProperties.ts
│   │   │   └── useApi.ts
│   │   ├── config/
│   │   │   └── api.ts              # API endpoint definitions
│   │   ├── types/
│   │   │   └── api.ts              # TypeScript interfaces & enums
│   │   ├── utils/
│   │   │   └── errorHandler.ts     # Centralized error handling
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── README.md                       # This file
├── README_CN.md                    # Chinese documentation
├── DEPLOYMENT_GUIDE.md             # Deployment instructions
├── IMPROVEMENTS.md                 # Code review & bug-fix summary
└── Schedora.sln                    # Visual Studio solution
```

---

## Quick Start

### Prerequisites

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
- Node.js 18+ and npm
- A PostgreSQL database (Supabase free tier works out of the box)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd Schedora
```

Edit `Backend/appsettings.json` and supply your connection string and Google credentials path:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=<host>;Database=<db>;Username=<user>;Password=<pass>"
  },
  "Google": {
    "CredentialsPath": "google-credentials.json",
    "CalendarId": "<your-calendar-id>",
    "SheetId": "<your-sheet-id>",
    "DailySyncHour": 8
  }
}
```

Place your `google-credentials.json` service-account file in the `Backend/` directory (it is git-ignored).

### 2. Start the Backend

```bash
cd Backend
dotnet restore
dotnet run
```

- API base URL: `http://localhost:5097`
- Swagger UI: `http://localhost:5097/swagger`

### 3. Start the Frontend

```bash
cd Frontend
npm install
npm run dev
```

- App URL: `http://localhost:5173`

The frontend reads the API base URL from the `VITE_API_BASE_URL` environment variable (defaults to `http://localhost:5097/api`).

### 4. Run It In The Background

If you want the app to stay running in the background on your Mac, use the helper script in this repo:

```bash
./scripts/schedora.sh status
./scripts/schedora.sh start
```

What it does:

- Starts the backend with `dotnet watch run --project Backend --launch-profile http --non-interactive`
- Starts the frontend with `npm run build -- --watch`
- Builds the frontend into `Backend/wwwroot`, so the app is served from `http://localhost:5097`
- Writes logs to `~/Library/Logs/schedora-backend.log` and `~/Library/Logs/schedora-frontend.log`

Extra commands:

```bash
./scripts/schedora.sh stop
./scripts/schedora.sh restart
```

---

## API Reference

### Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List all properties (ordered by ID desc) |
| POST | `/api/properties` | Create a property |
| PUT | `/api/properties/{id}` | Update a property |
| DELETE | `/api/properties/{id}` | Delete a property (blocked if related data exists) |

### Inspection Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inspectiontasks` | List all pending tasks |
| POST | `/api/inspectiontasks` | Create a task |
| PUT | `/api/inspectiontasks/{id}` | Update a task |
| DELETE | `/api/inspectiontasks/{id}` | Delete a task |
| POST | `/api/inspectiontasks/{id}/complete` | Complete & archive a task |

### Inspection Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inspectionrecords` | List records (supports date-range filter) |
| GET | `/api/inspectionrecords/{id}` | Get a single record |

### Google Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/googlesync/all` | Sync to both Calendar and Sheets |
| POST | `/api/googlesync/calendar` | Sync to Google Calendar only |
| POST | `/api/googlesync/sheets` | Sync to Google Sheets only |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/payroll` | Full payroll report |
| GET | `/api/reports/two-weeks` | Last 14-day summary |

---

## Pages Overview

### Properties Page (`/`)

- Table view of all properties with address and billing policy
- Create, edit, and delete properties via modal dialogs
- Deletion is blocked when the property has associated tasks or records

### Tasks Page (`/tasks`)

The primary workflow page. Tasks are grouped into three sections:

- **Today** — tasks scheduled for today
- **Upcoming** — tasks scheduled for future dates
- **Unscheduled** — tasks with no scheduled date

Features:
- Create new inspection tasks via a modal (property selection, type, date, notes)
- Complete a task inline — triggers auto-billing calculation and archives to history
- Inline row editing for quick updates
- View recent inspection records per property
- Manual Google Sync buttons (Calendar, Sheets, or both)

### History Page (`/history`)

- Lists all completed inspection records
- Filter by custom date range or presets (last 14 days, last 30 days)
- Displays task type, execution date, and billing status

---

## Google Workspace Integration

Schedora integrates with Google Calendar and Google Sheets via a service account.

**Setup:**

1. Create a Google Cloud project and enable the Calendar API and Sheets API.
2. Create a service account and download the JSON credentials file.
3. Share your target Google Calendar and Sheet with the service account email.
4. Place the credentials file at `Backend/google-credentials.json`.
5. Set `CalendarId` and `SheetId` in `appsettings.json`.

**Sync Behavior:**

- Manual sync is available from the Tasks page.
- The `DailySyncBackgroundService` auto-syncs every day at the hour configured in `DailySyncHour` (default: 8 AM).

---

## Billing Policies

Each property is assigned one of two billing policies that determine whether a completed routine inspection is chargeable:

| Policy | Logic |
|--------|-------|
| `SixMonthFree` | One routine inspection every 6 months; not charged |
| `ThreeMonthToggle` | Inspections every 3 months; charged and free alternate each cycle |

Move-in and move-out inspections are always treated as billable regardless of policy.

---

## Data Models

```
Property
  ├── Id (int, PK)
  ├── Address (string, 5–200 chars, indexed)
  └── BillingPolicy (SixMonthFree | ThreeMonthToggle)

InspectionTask
  ├── Id (int, PK)
  ├── PropertyId (int, FK → Property, Restrict delete)
  ├── ScheduledAt (DateTime?)
  ├── Type (MoveIn=0 | MoveOut=1 | Routine=2 | Other=3)
  ├── IsBillable (bool)
  └── Notes (string, max 500)

InspectionRecord
  ├── Id (int, PK)
  ├── PropertyId (int, FK → Property, Restrict delete)
  ├── ExecutionDate (DateTime)
  ├── Type (InspectionType)
  └── IsCharged (bool)
```

Database indexes are configured on: `Address`, `PropertyId`, `ScheduledAt`, `ExecutionDate`, and `CreatedAt` columns for fast query performance.

---

## Deployment

### Backend

```bash
cd Backend

# Restore and publish
dotnet restore
dotnet publish -c Release -o ./publish

# Run
cd publish
dotnet InspectionApi.dll
```

Ensure the `google-credentials.json` file is present in the working directory and the connection string in `appsettings.json` points to your production database.

### Frontend

```bash
cd Frontend
npm install
npm run build
# Output is in dist/

# Serve with any static host, e.g.:
npx serve -s dist -p 5173

# Or copy dist/ to your web server document root
```

### Database

The backend uses EF Core `EnsureCreated()` on startup to automatically initialize the schema. No manual migration steps are needed for a fresh deployment.

For production PostgreSQL on Supabase, create a new project, copy the connection string, and set it in `appsettings.json`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5097/api` | Backend API URL for the frontend build |

### CORS

By default the backend allows requests from `http://localhost:5173` and `http://localhost:3000`. Update `Program.cs` to add production frontend origins.

---

## Troubleshooting

### Backend fails to start

```bash
# Check if port 5097 is already in use
netstat -an | grep 5097

# Run with verbose logging
dotnet run --verbosity detailed
```

### Frontend cannot reach the backend

1. Confirm the backend is running and accessible.
2. Check `Frontend/src/config/api.ts` for the correct base URL.
3. Open the browser DevTools Console for network errors.
4. Verify CORS origins in `Program.cs` include the frontend URL.

### Foreign key constraint error on delete

This means the property has linked tasks or records. Remove or reassign them first:

```sql
-- Find linked tasks
SELECT * FROM "InspectionTasks" WHERE "PropertyId" = <id>;
-- Find linked records
SELECT * FROM "InspectionRecords" WHERE "PropertyId" = <id>;
```

### Google sync not working

1. Confirm `google-credentials.json` is present in the `Backend/` directory.
2. Verify the service account has been granted edit access to the Calendar and Sheet.
3. Check `CalendarId` and `SheetId` in `appsettings.json`.
4. Review backend logs for Google API error details.

---

## Recent Changes (2026-01-09)

A full code review was performed. Key fixes applied:

**Backend**
- Removed `EnsureDeleted()` call in `Program.cs` that was wiping the database on every startup
- Added database indexes on all frequently queried columns
- Configured foreign key constraints with `DeleteBehavior.Restrict` to protect data integrity
- Added pre-delete validation in `PropertiesController` to block deletion when related data exists
- Eliminated duplicate `AnyAsync` calls in `InspectionTasksController`
- Fixed task sort order (by `CreatedAt`, then `ScheduledAt`)
- Removed `[Phone]` validation attribute for international number compatibility

**Frontend**
- Extracted shared `handleApiError` into `utils/errorHandler.ts`
- Fixed sidebar menu active state to follow the current route using `useLocation`
- Removed unsafe `as any` type assertions in `HistoryPage.tsx`

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for full details.

---

## Performance

- API response time: < 100 ms (with database indexes)
- Frontend initial load: < 2 s
- Query performance improved ~50–80% after index additions

---

## Security

- CORS restricted to known frontend origins
- All API inputs validated server-side
- EF Core parameterized queries prevent SQL injection
- Foreign key constraints prevent orphaned records
- Google credentials file is git-ignored

---

## Roadmap

- [ ] User authentication and role-based authorization
- [ ] Data export (Excel / CSV / PDF)
- [ ] Email notifications for upcoming inspections
- [ ] Data visualization dashboards
- [ ] EF Core Migrations (replacing `EnsureCreated`)
- [ ] Pagination for large datasets
- [ ] Mobile-responsive layout improvements
- [ ] Docker Compose setup for one-command deployment
- [ ] Real-time notifications via SignalR
- [ ] PWA / offline support

---

## Related Documents

- [README_CN.md](./README_CN.md) — Chinese version of this document
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — Detailed deployment and rollback instructions
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) — Code review and bug-fix log
- Swagger UI — Available at `http://localhost:5097/swagger` when running locally

---

## Author

Created by **Jabin** — 2026

---

## License

This project is for personal and learning use.
