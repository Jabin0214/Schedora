# Inspect Copy Buttons Design

**Date:** 2026-06-04

## Goal

Add three convenient copy actions to every card on the Inspect page:

- Copy the property's address.
- Copy the General template matching the task's inspection type.
- Copy the card's current notes.

## UI

Place three compact secondary buttons in the existing action row before `AI 润色` and `Done`. Use the existing Ant Design `CopyOutlined` icon and toast messages so the behavior matches other copy actions in the app.

## Template Matching

Load templates through the existing `useTemplates()` hook at page level. Match the task's inspection type name to a template inspection type name after trimming whitespace and comparing case-insensitively, then copy its General template text.

If content is empty, templates fail to load, or no matching template exists, show a warning/error toast and do not write to the clipboard.

## Verification

Run the frontend build and lint checks. Manually verify that each button copies the expected value and that empty or unavailable values show feedback.
