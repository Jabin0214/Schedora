# One-Line Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-line task input that uses AI to draft task details, matches possible properties from the database, and creates the task only after user confirmation.

**Architecture:** Add a backend AI draft endpoint that extracts structured fields from natural language and resolves property candidates server-side. The frontend displays the draft and candidate address choices, then reuses the existing task creation API after confirmation.

**Tech Stack:** ASP.NET Core, EF Core, PostgreSQL, existing chat-completions AI provider, React, Ant Design.

---

### Task 1: Backend Draft Contract and Matching

**Files:**
- Create: `Backend/Models/DTOs/AiTaskDraftDto.cs`
- Create: `Backend/Services/IAiTaskDraftService.cs`
- Create: `Backend/Services/AiTaskDraftService.cs`
- Modify: `Backend/Controllers/AiInspectionController.cs`
- Modify: `Backend/Program.cs`
- Test: `Backend.Tests/AiTaskDraftServiceTests.cs`

- [ ] Write failing tests for returning property candidates from a partial address query.
- [ ] Implement DTOs for request, extracted fields, property candidates, and draft response.
- [ ] Implement server-side fuzzy address matching with case-insensitive token matching.
- [ ] Add `POST /api/ai/task-draft`.

### Task 2: AI Extraction

**Files:**
- Modify: `Backend/Services/AiTaskDraftService.cs`
- Test: `Backend.Tests/AiTaskDraftServiceTests.cs`

- [ ] Write failing tests for building a usable draft from AI-extracted fields.
- [ ] Call the existing AI provider configuration and require JSON output.
- [ ] Convert task type names to existing task type IDs.
- [ ] Parse relative date text conservatively; leave unset when uncertain.

### Task 3: Frontend Confirmation Flow

**Files:**
- Modify: `Frontend/src/config/api.ts`
- Modify: `Frontend/src/types/api.ts`
- Modify: `Frontend/src/pages/TasksPage.tsx`

- [ ] Add endpoint and response types.
- [ ] Add one-line task input above the task list.
- [ ] Show draft preview and property candidate selector.
- [ ] On confirmation, call existing `createInspectionTask`.

### Verification

- [ ] Run backend tests.
- [ ] Run frontend typecheck or build.
- [ ] Manually inspect that the UI path requires confirmation before creation.
