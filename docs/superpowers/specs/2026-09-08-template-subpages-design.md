# Template Subpages Design

## Goal

Separate the Templates screen into focused, switchable sections so users do not need to scroll between report-description templates and Review Comment templates.

## Interface

The page keeps the existing title and template-management control. Immediately below it, a two-item tab control provides `报告描述` and `Review Comments`.

- `报告描述` is the initial tab and retains the inspection-type selector, General preview, copy action, loading, and error handling.
- `Review Comments` presents the three fixed rent-review cards and their individual copy actions.
- The management control stays available only in the report-description section because it manages those editable templates, not the fixed Review Comments.

## Data and Error Handling

Review Comments remain local, fixed data and must be available even when the report-template request fails. The report tab owns its current loading/empty/error presentations, so an API failure does not affect Review Comments.

## Verification

Add a small pure view-state helper with tests covering the two tabs and their default. Build and run the complete frontend suite. Confirm in the running app that the two sections are independently visible.
