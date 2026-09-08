# History Work Units Design

## Goal

History should keep one real record for each completed inspection while allowing payroll-style reports to count heavier work as more than one unit.

Move in and Move out records should normally count as two units because they take more time. Some far-away inspections should also be adjustable to two units without pretending the work happened twice.

## Chosen Approach

Add a `WorkUnits` value to each inspection history record.

- Routine and Other records default to `1`.
- Move in and Move out records default to `2`.
- The user can edit an individual history record and set `WorkUnits` to `1` or `2`.
- The table still shows one row per real completed inspection.
- Summary cards and exported reports use the sum of `WorkUnits` for payroll-style counting.

This avoids duplicate history rows, duplicate parking charges, and misleading address history while still making the work calculation reflect effort.

## UI

History gets one compact editable column named `Units`.

Read-only display:

- `1x` for ordinary records.
- `2x` for Move in, Move out, or manually marked far-away records.

Inline edit:

- The existing double-click edit mode includes a small selector or numeric input for `Units`.
- Allowed values are `1` and `2` for now.

Summary:

- The current `Inspections` card continues to show the real record count.
- Add or adjust supporting text to show total work units.
- PDF export includes the units column and uses total work units in its footer/summary.

## Data Model

Add `WorkUnits` to `InspectionRecord`.

- Type: integer.
- Required.
- Default: `1`.
- Existing records should be backfilled based on type:
  - Move in: `2`.
  - Move out: `2`.
  - Routine and Other: `1`.

When an inspection task is completed, the backend sets the new record's `WorkUnits` automatically from the task type.

## API

Include `WorkUnits` in:

- Inspection history list responses.
- Inspection record update requests.
- Payroll report record DTOs.

Validation:

- Only `1` or `2` is accepted.
- Missing values in older clients should fall back to the type-based default if practical.

## Reporting

History calculations should distinguish:

- Real inspection records: number of rows.
- Work units: sum of `WorkUnits`.
- Office hours: still based on workdays unless the app later changes that formula.

This keeps the current office-hours concept intact while adding a separate unit count for effort-based payroll calculations.

## Tests

Backend tests should cover:

- Completing a Move in task creates a history record with `WorkUnits = 2`.
- Completing a Move out task creates a history record with `WorkUnits = 2`.
- Completing Routine or Other creates `WorkUnits = 1`.
- Updating a history record accepts `1` or `2`.
- Updating a history record rejects invalid values.

Frontend verification should cover:

- History displays `Units`.
- Inline edit can save units.
- Summary and PDF totals use work units without duplicating rows.
