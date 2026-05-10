# AI Inspection Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-assisted action on the Inspect page that turns rough inspection notes into professional tenant, landlord, and general inspection wording.

**Architecture:** The backend owns the prompt and model call so API keys never reach the browser. The prompt builder is pure and tested; the DeepSeek-compatible HTTP client is isolated behind an interface. The frontend sends the current task context and notes, then shows generated text that can be inserted or copied.

**Tech Stack:** ASP.NET Core Web API, xUnit, React 19, TypeScript, Ant Design, Axios, DeepSeek/OpenAI-compatible chat completions API.

---

### Task 1: Backend prompt and DTOs

**Files:**
- Create: `Backend/Models/DTOs/AiInspectionDto.cs`
- Create: `Backend/Services/AiInspectionPromptBuilder.cs`
- Test: `Backend.Tests/AiInspectionPromptBuilderTests.cs`

- [x] Write failing tests for prompt requirements: professional property-management tone, rough notes included, address included, task type included, JSON-only output contract included, no invented facts rule included.
- [x] Implement DTOs for request/response and a pure prompt builder.
- [x] Run `dotnet test Backend.Tests/Backend.Tests.csproj --filter AiInspectionPromptBuilderTests`.

### Task 2: Backend DeepSeek-compatible service and endpoint

**Files:**
- Create: `Backend/Services/IAiInspectionService.cs`
- Create: `Backend/Services/AiInspectionService.cs`
- Create: `Backend/Controllers/AiInspectionController.cs`
- Modify: `Backend/Program.cs`
- Modify: `Backend/appsettings.json`

- [x] Register an HTTP client and service dependency.
- [x] Add `POST /api/ai/inspection-polish`, protected by JWT like the rest of the app.
- [x] Accept model config from `Ai:ApiKey`, `Ai:BaseUrl`, and `Ai:Model`.
- [x] Return a deterministic fallback error message when AI config is missing or the provider fails.

### Task 3: Frontend Inspect page integration

**Files:**
- Modify: `Frontend/src/config/api.ts`
- Modify: `Frontend/src/types/api.ts`
- Modify: `Frontend/src/pages/InspectPage.tsx`

- [x] Add AI endpoint constants and response types.
- [x] Add a compact AI action to each inspect card.
- [x] Show generated General, Tenant, and Landlord text in a modal.
- [x] Let the user copy each generated message or replace the current note with General text.

### Task 4: Verification

**Commands:**
- [x] `dotnet test Backend.Tests/Backend.Tests.csproj`
- [x] `cd Frontend && npm run build`

**Manual check:**
- [ ] Configure DeepSeek-compatible settings in `Backend/appsettings.local.json`, start the app, enter rough notes on Inspect, and run AI polish.
