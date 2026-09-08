# Review Comment Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom rent-review sentence generator to Review Comments.

**Architecture:** A pure TypeScript module generates one sentence from local form data. TemplatesPage owns the Ant Design form state and copies the generated result without server persistence.

**Tech Stack:** React 19, TypeScript, Ant Design, Vitest.

---

### Task 1: Create a tested rent-review sentence helper

**Files:**

- Create: `Frontend/src/utils/reviewCommentGenerator.ts`
- Create: `Frontend/src/utils/reviewCommentGenerator.test.ts`

- [ ] Write failing tests for a rent increase/fixed term and unchanged/periodic tenancy.
- [ ] Run `npm test -- src/utils/reviewCommentGenerator.test.ts` and verify the missing-module failure.
- [ ] Export `ReviewCommentInput`, `formatReviewDate`, and `buildReviewComment`. The helper omits empty optional fragments and never invents a rent amount or date.
- [ ] Run the focused test and verify it passes.

### Task 2: Add the generator card to Review Comments

**Files:**

- Modify: `Frontend/src/pages/TemplatesPage.tsx`

- [ ] Add local form state and a `自定义租约评论` card before the fixed reference cards.
- [ ] Include optional rent and start-date inputs, a fixed/periodic selector, conditional term and end-date inputs, a live preview, and a copy button.
- [ ] Run `npm test && npm run build` and verify all tests and the production build pass.
- [ ] Verify `/templates` shows the fixed and periodic versions correctly, then commit the source, build assets, and these documents as `feat: add custom rent review generator`.
