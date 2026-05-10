# Schedora

Schedora is a property inspection management system built with ASP.NET Core and React. It helps manage properties, schedule inspection work, review history, and sync data to Google Calendar and Google Sheets.

## Overview

- Backend: ASP.NET Core Web API on .NET 9
- Frontend: React 19 + TypeScript + Vite
- Database: PostgreSQL
- Hosting model: the backend can serve the built frontend from `Backend/wwwroot`
- Optional integrations: Google Calendar, Google Sheets, scheduled daily sync, AI inspection wording via a DeepSeek-compatible chat model

## Main Features

- Manage properties and billing policies
- Create, update, complete, and archive inspection tasks
- View inspection history and payroll-style reports
- Manage task types
- Calendar-style task view in the frontend
- Sync tasks to Google Calendar and Google Sheets
- Run a daily background sync job
- Generate professional AI inspection wording from rough site notes, with tenant tasks and landlord maintenance notifications separated

## Project Structure

```text
Schedora/
├── Backend/                 ASP.NET Core API and static hosting
├── Frontend/                React application
├── scripts/schedora.sh      Background runner for macOS
├── .runtime/                PID files used by the helper script
└── Schedora.sln             Solution file
```

Important backend files:

- `Backend/Program.cs`: service registration, database setup, CORS, static file hosting
- `Backend/appsettings.json`: shared app settings
- `Backend/appsettings.local.json`: local secrets and machine-specific config
- `Backend/Properties/launchSettings.json`: local launch profiles

Important frontend files:

- `Frontend/src/App.tsx`: main layout and routes
- `Frontend/src/config/api.ts`: API base URL configuration
- `Frontend/vite.config.ts`: dev server config and build output to `Backend/wwwroot`

## Requirements

- .NET 9 SDK
- Node.js 18+ and npm
- PostgreSQL database

## Configuration

The app expects a database connection string and can optionally use Google credentials.

Create `Backend/appsettings.local.json` for local development:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=<host>;Database=<db>;Username=<user>;Password=<pass>"
  },
  "Google": {
    "CredentialsPath": "google-credentials.json",
    "CalendarId": "",
    "SheetId": "",
    "DailySyncHour": 8
  },
  "Ai": {
    "BaseUrl": "https://api.deepseek.com",
    "Model": "deepseek-chat",
    "ApiKey": "<deepseek-api-key>"
  }
}
```

Notes:

- `appsettings.local.json` is loaded by the backend and is intended for local secrets.
- `appsettings.local.json` and `google-credentials.json` are excluded from publish output; production secrets must be configured through hosting environment settings.
- If Google sync is enabled, place the credential file in `Backend/` unless you configure a different path.
- The AI inspection feature uses an OpenAI-compatible chat completions endpoint. The defaults are set for DeepSeek, and only `Ai:ApiKey` is required for local use.
- The frontend uses `VITE_API_BASE_URL` and defaults to same-origin `/api`. Local Vite development proxies `/api` to the ASP.NET backend.

### AI inspection wording

On the Inspect page, enter rough inspection notes and choose `AI 润色`. The backend sends the notes, property address, inspection type, and billable flag to the configured AI provider, then returns three text blocks:

- `General`: a bilingual English official record and Chinese proofreading version, structured as General Notes and Specific Advice
- `Tenant`: tenant-facing tasks, including a two-week photo follow-up requirement for cleaning or minor-care issues
- `Landlord`: owner-facing maintenance, hazard, leak, mould, or damage notifications

The prompt is written for a professional New Zealand property inspector/property manager voice. It tells the model to stay objective, separate tenant responsibilities from landlord maintenance, avoid legal advice, and avoid inventing facts not present in the rough notes.

### Azure App Service settings

When deploying to Azure App Service, configure these app settings in Azure instead of relying on local files:

```text
ConnectionStrings__DefaultConnection
Jwt__Secret
Jwt__Issuer
Jwt__Audience
Jwt__ExpiryHours
Auth__Credentials__Username
Auth__Credentials__Password
Google__CredentialsJson
Google__CalendarId
Google__SheetId
Google__DailySyncHour
Ai__BaseUrl
Ai__Model
Ai__ApiKey
WEBSITE_TIME_ZONE
```

`Jwt__Secret` is required at startup. If it is missing, the app exits during boot and Azure Free tier can quickly exhaust its worker stop quota.

## Run Locally

There are two common ways to run the project.

### Option 1: Full local development

Use this when you want a separate React dev server with hot reload.

1. Start the backend:

```bash
cd Backend
dotnet restore
dotnet watch run --launch-profile http
```

2. Start the frontend in another terminal:

```bash
cd Frontend
npm install
npm run dev
```

Default local URLs:

- Backend: `http://localhost:5097`
- Swagger: `http://localhost:5097/swagger`
- Frontend dev server: `http://localhost:3000`

If needed:

```bash
cd Frontend
VITE_API_BASE_URL=http://localhost:5097/api npm run dev
```

### Option 2: Backend serves the built frontend

Use this when you want a single app entrypoint from the backend.

1. Build the frontend into `Backend/wwwroot`:

```bash
cd Frontend
npm install
npm run build
```

2. Start the backend:

```bash
cd Backend
dotnet restore
dotnet run --launch-profile http
```

Then open:

- App: `http://localhost:5097`
- API: `http://localhost:5097/api/...`

## Background Mode on macOS

The repo includes a helper script for running the backend and frontend watcher in the background:

```bash
./scripts/schedora.sh status
./scripts/schedora.sh start
./scripts/schedora.sh stop
./scripts/schedora.sh restart
```

What it does:

- Starts the backend with `dotnet watch run`
- Starts a frontend build watcher with `npm run build -- --watch`
- Writes frontend output into `Backend/wwwroot`
- Writes logs to:
  - `~/Library/Logs/schedora-backend.log`
  - `~/Library/Logs/schedora-frontend.log`

## LaunchAgent

On macOS, this project may also be configured through `launchd`.

Common files:

- `~/Library/LaunchAgents/com.schedora.backend.plist`
- `~/Library/LaunchAgents/com.schedora.frontend.plist`

Useful commands:

```bash
launchctl list | rg "com\\.schedora\\."
launchctl print gui/$(id -u)/com.schedora.backend
launchctl print gui/$(id -u)/com.schedora.frontend
```

## API Surface

Main backend controllers currently include:

- `/api/properties`
- `/api/inspectiontasks`
- `/api/inspectionrecords`
- `/api/tasktypes`
- `/api/reports`
- `/api/googlesync`
- `/api/ai/inspection-polish`

For request and response details, use Swagger locally in development:

- `http://localhost:5097/swagger`

## Google Sync

Google integration is handled in the backend service layer and includes:

- Full sync to Google Calendar
- Full sync to Google Sheets
- A hosted background service for daily sync

Manual sync endpoints:

- `POST /api/googlesync/calendar`
- `POST /api/googlesync/sheets`
- `POST /api/googlesync/all`

If Google credentials or IDs are missing, related features will not work correctly.

## AI Provider

The AI inspection endpoint is configured under `Ai` in ASP.NET configuration:

```json
{
  "Ai": {
    "BaseUrl": "https://api.deepseek.com",
    "Model": "deepseek-chat",
    "ApiKey": "<secret>"
  }
}
```

`BaseUrl` should point to the provider root that exposes `/chat/completions`. The backend adds the `/chat/completions` path itself. The API key must stay on the backend; do not expose it through Vite environment variables or frontend code.

If AI configuration is missing or the provider is unavailable, the Inspect page will show an error message and the original note remains unchanged.

## Troubleshooting

### Backend starts but cannot use data

- Check `Backend/appsettings.local.json`
- Verify `ConnectionStrings:DefaultConnection`
- Check the backend log output for database connection errors

### Frontend cannot reach the API

- Confirm the backend is running on `http://localhost:5097`
- Confirm `VITE_API_BASE_URL` if you are using the Vite dev server
- If you are using the built frontend served by ASP.NET, make sure `Frontend` has been built into `Backend/wwwroot`

### Background services appear to be running

Check:

```bash
./scripts/schedora.sh status
launchctl list | rg "com\\.schedora\\."
ps aux | rg -i "schedora|dotnet watch|InspectionApi|vite"
```

## Notes

- The backend loads `appsettings.local.json` in addition to the default config files.
- The frontend build output is intentionally written into `Backend/wwwroot`.
- In development, Swagger is enabled automatically.
