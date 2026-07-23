# Tenant Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Palace tenant contact CSV rows and attach safely matched contacts to existing properties.

**Architecture:** Add `TenantContact` as a child entity of `Property`, expose authenticated APIs for listing and CSV import, and update the React admin UI with import/search plus property-level contact summaries. CSV import only auto-attaches exact normalized address matches to avoid putting contact details under the wrong property.

**Tech Stack:** ASP.NET Core 9, EF Core/Npgsql, xUnit, React, TypeScript, Ant Design.

---

### Task 1: Backend Matching and Import Core

**Files:**
- Create: `Backend/Services/TenantContactImportService.cs`
- Create: `Backend.Tests/TenantContactImportServiceTests.cs`
- Modify: `Backend/Models/Entities.cs`
- Modify: `Backend/Data/AppDbContext.cs`
- Modify: `Backend/Data/DatabaseStartupSql.cs`
- Modify: `Backend/Program.cs`

- [ ] Write failing tests for Palace CSV parsing, safe address normalization, and unmatched rows.
- [ ] Implement `TenantContact`, DbContext mapping, startup SQL, and import service.
- [ ] Run focused backend tests.

### Task 2: Backend API

**Files:**
- Create: `Backend/Controllers/TenantContactsController.cs`
- Create: `Backend/Models/DTOs/TenantContactDtos.cs`
- Modify: `Backend/Controllers/PropertiesController.cs`

- [ ] Add APIs to list/search contacts and import a CSV upload.
- [ ] Include contact counts/summaries in property responses.
- [ ] Run backend tests.

### Task 3: Frontend UI

**Files:**
- Create: `Frontend/src/pages/TenantContactsPage.tsx`
- Modify: `Frontend/src/App.tsx`
- Modify: `Frontend/src/config/api.ts`
- Modify: `Frontend/src/types/api.ts`
- Modify: `Frontend/src/pages/PropertiesPage.tsx`

- [ ] Add contacts navigation, import/search page, and property contact summary column.
- [ ] Build frontend and fix compile errors.

### Task 4: Verification

- [ ] Run `dotnet test`.
- [ ] Run `npm run build` in `Frontend`.
- [ ] Report any skipped checks or remaining risks.
