# History Work Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable work-unit counting to inspection history so Move in, Move out, and far-away jobs can count as two units without duplicating records.

**Architecture:** Store `WorkUnits` on `InspectionRecord`, default it from inspection type at task completion, expose it through existing history/report DTOs, and let the History page edit and export it. Keep one row per real inspection; all effort-based totals use `sum(WorkUnits)`.

**Tech Stack:** ASP.NET Core, EF Core, PostgreSQL startup SQL, xUnit, React, TypeScript, Ant Design.

---

### Task 1: Backend Work-Unit Rules

**Files:**
- Modify: `Backend.Tests/InspectionTaskServiceDataSafetyTests.cs`
- Modify: `Backend/Models/Entities.cs`
- Modify: `Backend/Services/InspectionTaskService.cs`

- [ ] **Step 1: Write failing completion tests**

Add tests proving Move in and Move out complete to `WorkUnits = 2`, while Routine completes to `WorkUnits = 1`.

- [ ] **Step 2: Run backend test file and verify RED**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter InspectionTaskServiceDataSafetyTests`

Expected: tests fail because `InspectionRecord.WorkUnits` does not exist.

- [ ] **Step 3: Implement minimal model and completion defaults**

Add `WorkUnits` to `InspectionRecord` and set it during `CompleteTaskAsync` with Move in / Move out = 2, everything else = 1.

- [ ] **Step 4: Run backend test file and verify GREEN**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter InspectionTaskServiceDataSafetyTests`

Expected: pass.

### Task 2: API Validation And Database Startup SQL

**Files:**
- Modify: `Backend.Tests/InspectionRecordsControllerDataSafetyTests.cs`
- Modify: `Backend.Tests/DatabaseStartupSqlTests.cs`
- Modify: `Backend/Models/DTOs/ReportDto.cs`
- Modify: `Backend/Controllers/InspectionRecordsController.cs`
- Modify: `Backend/Data/AppDbContext.cs`
- Modify: `Backend/Data/DatabaseStartupSql.cs`

- [ ] **Step 1: Write failing API and SQL tests**

Add tests for update accepting `WorkUnits = 2`, rejecting invalid values, and startup SQL adding/backfilling the `WorkUnits` column.

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter "InspectionRecordsControllerDataSafetyTests|DatabaseStartupSqlTests"`

Expected: tests fail because DTO/API/SQL do not include `WorkUnits`.

- [ ] **Step 3: Implement DTO, query, validation, EF config, and startup SQL**

Expose `WorkUnits` in history/report DTOs, include it in list queries, validate only 1 or 2 during update, configure a default value of 1, and add startup SQL that backfills Move in and Move out to 2.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter "InspectionRecordsControllerDataSafetyTests|DatabaseStartupSqlTests"`

Expected: pass.

### Task 3: Frontend History Units

**Files:**
- Modify: `Frontend/src/types/api.ts`
- Modify: `Frontend/src/pages/HistoryPage.tsx`

- [ ] **Step 1: Update frontend types and History UI**

Add `workUnits` to `InspectionRecordDto`, add it to edit state, render a compact `Units` column, send it during save, and calculate/export total work units.

- [ ] **Step 2: Run frontend checks**

Run: `npm --prefix Frontend run build`

Expected: build passes.

### Task 4: Full Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run backend tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj`

Expected: pass.

- [ ] **Step 2: Run frontend build**

Run: `npm --prefix Frontend run build`

Expected: pass.
