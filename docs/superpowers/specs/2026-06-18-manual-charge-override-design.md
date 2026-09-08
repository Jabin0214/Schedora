# Manual Charge Override Design

## Goal

Allow users to choose whether an inspection task is Charged or Free while retaining the existing billing policy as a default suggestion.

## Behaviour

- When a property is selected for a new task, the frontend suggests Charged or Free using the property's billing policy and inspection history.
- The user may change that suggestion before saving.
- Creating or editing a task stores the user's selected value without recalculating it on the backend.
- Completing a task copies the task's stored billing value into the inspection record.
- Editing an inspection history record may still correct its final Charged or Free value.
- Changing the property or relevant scheduling details may refresh the suggestion only during task creation. It must not silently overwrite a saved manual choice during editing or completion.

## Data Flow

1. The frontend calculates a suggested `isBillable` value for a new task.
2. The user accepts or changes the value.
3. The API validates and persists the submitted boolean.
4. Task completion persists that stored value as `InspectionRecord.IsCharged`.

No new database column or migration is required because `InspectionTask.IsBillable` already stores the final choice.

## Safety

- Property and task-type validation remain server-side.
- Fee and date validation remain unchanged.
- The backend must not reinterpret an explicit billing choice from a valid task request.
- Automated tests cover create, update, and completion so a manual choice cannot be overwritten by the billing policy.

## User Interface

- Enable the Charged/Free selector in both the new-task form and inline task editing.
- Keep the existing policy explanation and automatic initial suggestion.
- Use the task's saved value when editing an existing task.

## Out of Scope

- Adding an Auto/Manual billing mode.
- Recalculating existing tasks or inspection history.
- Applying a manual choice to other future tasks automatically.
