# Inspect Copy Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add separate General-template copy buttons to each Inspect card.

**Architecture:** Fetch the existing template collection once in `InspectPage`, build a copy option for every template inspection type, and pass those options into each `InspectCard`. Reuse the card's existing clipboard helper and Ant Design feedback.

**Tech Stack:** React 19, TypeScript, Ant Design 6

---

### Task 1: Add the three copy actions

**Files:**
- Modify: `Frontend/src/pages/InspectPage.tsx`

- [ ] **Step 1: Load templates at page level**

Import and call `useTemplates()` in `InspectPage`, then build an option containing the name and General text for every template inspection type.

- [ ] **Step 2: Pass template state to each card**

Extend `InspectCardProps` with `templateOptions`, `templateLoading`, and `templateError`, and pass those values from the page.

- [ ] **Step 3: Add the copy buttons**

Add compact `CopyOutlined` buttons before the existing `AI 润色` and `Done` actions. Render one button per template inspection type and copy its General template text. Use the existing clipboard helper and show explicit Ant Design feedback for empty content or template loading errors.

- [ ] **Step 4: Verify**

Run:

```bash
cd Frontend
npm run build
npm run lint
```

Expected: both commands exit successfully.
