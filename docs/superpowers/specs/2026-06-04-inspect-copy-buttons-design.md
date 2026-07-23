# Inspect Copy Buttons Design

**Date:** 2026-06-04

## Goal

Add convenient General-template copy actions to every card on the Inspect page. The existing three default template inspection types produce three separate copy buttons.

## UI

Place compact secondary buttons in the existing action row before `AI 润色` and `Done`. Each button displays its template inspection type name and uses the existing Ant Design `CopyOutlined` icon and toast messages.

## Template Matching

Load templates through the existing `useTemplates()` hook at page level. Build one copy action per template inspection type and copy that type's General template text.

If content is empty or templates fail to load, show a warning/error toast and do not write to the clipboard.

## Verification

Run the frontend build and lint checks. Manually verify that each button copies the expected value and that empty or unavailable values show feedback.
