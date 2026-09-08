# Inspection Raw Note Snapshots Design

## Goal

Keep the original PRO/field inspection notes before AI polishing so they can be reviewed, searched, edited, or deleted later. AI-polished one-off outputs, such as landlord or tenant wording, must remain transient and should not be stored.

## User Workflow

On the Inspect page, the user writes rough inspection notes as they do now. When they click AI polish, the system first captures the current rough note as a raw snapshot, then calls the AI service and shows the polished wording.

If the user edits the rough note and clicks AI polish again for the same inspection task, the system adds another raw snapshot under the same inspection history entry. The final history should read as one inspection record for that task/date, with multiple raw note snapshots inside it.

When the user clicks Done, the inspection task becomes an inspection record. Any raw snapshots captured while the task was active move with it, so the completed inspection keeps its source notes.

## Data Model

Add a child table for raw note snapshots instead of storing all snapshots as one large text field on `InspectionRecords`.

`InspectionRawNoteSnapshots`

| Field | Purpose |
| --- | --- |
| `Id` | Primary key |
| `InspectionTaskId` | Nullable link while the inspection is still an active task |
| `InspectionRecordId` | Nullable link after the task is completed |
| `PropertyId` | Stable property link for filtering and search |
| `CapturedAt` | When the raw note was captured |
| `Sequence` | Snapshot order within the task or record |
| `Source` | Capture trigger, initially `AiPolish` |
| `RawNotes` | The original note text before AI polishing |
| `EditedAt` | Nullable future field for manual edits |
| `DeletedAt` | Nullable future field for soft delete |

Only one of `InspectionTaskId` or `InspectionRecordId` should be set at a time. While a task is active, snapshots attach to the task. When the task is completed, the service creates the `InspectionRecord`, moves matching snapshots from the task id to the new record id, and clears the task link.

This keeps the history grouped by the final inspection record while still allowing snapshots before completion.

## API Flow

Extend the AI polish request with the active task id:

```json
{
  "inspectionTaskId": 123,
  "address": "123 Queen St",
  "inspectionType": "Routine",
  "notes": "raw field note...",
  "isBillable": false
}
```

The backend endpoint should:

1. Validate the task exists and belongs to the supplied note context.
2. Save a raw note snapshot if `notes` is not blank.
3. Call the existing AI polish service.
4. Return only the AI response to the frontend.

The AI response should not include the snapshot payload unless the UI needs a simple confirmation flag. Polished `englishGeneralText`, `englishTenantText`, `englishLandlordText`, and `chineseReferenceText` remain transient.

## UI Behavior

The Inspect page should keep the same main interaction:

- `AI 润色` saves the raw snapshot first.
- The modal still displays AI wording for copying or inserting.
- `插入到备注` may replace the current editable note, but that inserted AI wording should not be stored as a raw snapshot unless the user later edits/uses it and clicks AI polish again.

For later management, add a history/details area that can show snapshots under one inspection record. Each snapshot should display capture time, sequence number, and raw note text. Future controls can allow edit and soft delete without changing the main capture flow.

## Search And Retrieval

Raw snapshots should be searchable by:

- property
- inspection record
- date range through the parent record or capture time
- raw note text

Initial implementation can expose snapshots through inspection record detail endpoints. Full text search or a dedicated snapshot search endpoint can come later.

## Error Handling

If snapshot saving fails, AI polishing should stop and the user should see a clear error. This prevents a situation where AI output exists but the source note was not recorded.

If AI polishing fails after the snapshot is saved, the snapshot should remain. The user still benefits from having preserved the original note and can retry AI polishing later.

When completing a task, moving snapshots to the new inspection record should happen in the same database save operation as creating the record and deleting the task.

## Testing

Backend tests should cover:

- AI polish creates a raw snapshot before calling AI.
- Repeated AI polish calls for the same task create ordered snapshots under the same task.
- Completing a task moves snapshots to the created inspection record.
- AI output fields are not persisted.
- Blank or invalid notes do not create snapshots.
- Deleted snapshots are excluded from normal history reads.

Frontend tests can stay light unless a snapshot history UI is added immediately. The first implementation mainly needs request payload coverage and manual verification of the Inspect flow.

## Out Of Scope

The first implementation will not store AI-polished outputs, build full-text search, or add complex version comparison. It will only preserve raw notes in an organized structure and leave room for edit/delete/history management.
