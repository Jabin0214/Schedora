# Manual Charge Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users override the automatic Charged/Free suggestion and preserve that choice through task creation, editing, and completion.

**Architecture:** The frontend remains responsible for calculating the initial suggestion from property policy and recent history. The selected boolean is submitted to the API, stored on `InspectionTask.IsBillable`, and copied unchanged to `InspectionRecord.IsCharged` when the task is completed.

**Tech Stack:** ASP.NET Core 9, Entity Framework Core 9, xUnit, React 19, TypeScript, Ant Design, Vite

---

### Task 1: Protect Manual Billing Choices in Backend Tests

**Files:**
- Modify: `Backend.Tests/InspectionTaskServiceDataSafetyTests.cs`

- [ ] **Step 1: Replace the completion-policy test with a manual-choice regression test**

Rename `CompleteTaskRecomputesChargeFromBillingPolicyInsteadOfPersistingStaleTaskBillable` to `CompleteTaskPersistsManualBillingChoiceEvenWhenPolicySuggestsFree` and change its final billing assertion to:

```csharp
Assert.True(completedRecord.IsCharged);
Assert.Empty(await context.InspectionTasks.ToListAsync());
```

The existing setup deliberately includes a previous charged inspection, so the automatic toggle would suggest Free while the saved task explicitly says Charged.

- [ ] **Step 2: Add a create regression test**

Add this test before `CreateTaskRejectsMissingTaskType`:

```csharp
[Fact]
public async Task CreateTaskPersistsManualFreeChoiceWhenPolicySuggestsCharged()
{
    await using var context = CreateContext();
    var service = CreateService(context);
    var property = new Property
    {
        Address = "56 Test Road",
        BillingPolicy = BillingPolicy.ThreeMonthToggle
    };
    context.Properties.Add(property);
    context.TaskTypes.Add(new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 });
    await context.SaveChangesAsync();

    var created = await service.CreateTaskAsync(new InspectionTaskCreateDto
    {
        PropertyId = property.Id,
        Type = 2,
        ScheduledAt = "2026-06-10T10:00:00+12:00",
        IsBillable = false
    });

    Assert.False(created.IsBillable);
    Assert.False((await context.InspectionTasks.SingleAsync()).IsBillable);
}
```

- [ ] **Step 3: Add an update regression test**

Add this test after the create regression test:

```csharp
[Fact]
public async Task UpdateTaskPersistsManualChargedChoiceWhenPolicySuggestsFree()
{
    await using var context = CreateContext();
    var service = CreateService(context);
    var property = new Property
    {
        Address = "78 Test Lane",
        BillingPolicy = BillingPolicy.ThreeMonthToggle
    };
    context.Properties.Add(property);
    context.TaskTypes.Add(new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 });
    await context.SaveChangesAsync();
    context.InspectionRecords.Add(new InspectionRecord
    {
        PropertyId = property.Id,
        ExecutionDate = DateTimeOffset.Parse("2026-06-01T10:00:00+12:00"),
        Type = InspectionType.Routine,
        IsCharged = true
    });
    var task = new InspectionTask
    {
        PropertyId = property.Id,
        ScheduledAt = DateTimeOffset.Parse("2026-06-10T10:00:00+12:00"),
        Type = InspectionType.Routine,
        IsBillable = false
    };
    context.InspectionTasks.Add(task);
    await context.SaveChangesAsync();

    var updated = await service.UpdateTaskAsync(task.Id, new InspectionTaskUpdateDto
    {
        PropertyId = property.Id,
        Type = 2,
        ScheduledAt = "2026-06-10T10:00:00+12:00",
        IsBillable = true
    });

    Assert.True(updated);
    Assert.True((await context.InspectionTasks.SingleAsync()).IsBillable);
}
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```bash
dotnet test Backend.Tests/Backend.Tests.csproj --no-restore --filter FullyQualifiedName~InspectionTaskServiceDataSafetyTests
```

Expected: the create, update, and completion manual-choice tests fail because the service currently recalculates billing from policy and history.

### Task 2: Make the Backend Preserve the Submitted Choice

**Files:**
- Modify: `Backend/Services/InspectionTaskService.cs`

- [ ] **Step 1: Remove backend billing-policy recalculation**

Delete the private `ShouldChargeAsync` method. In `CreateTaskAsync`, remove the call to that method and set:

```csharp
IsBillable = dto.IsBillable
```

In `UpdateTaskAsync`, remove the `billingPolicy` and `isBillable` local variables and set:

```csharp
existingTask.IsBillable = dto.IsBillable;
```

In `CompleteTaskAsync`, remove the policy lookup and recalculation, then set the record value to:

```csharp
IsCharged = task.IsBillable,
```

- [ ] **Step 2: Run the focused tests and verify GREEN**

Run:

```bash
dotnet test Backend.Tests/Backend.Tests.csproj --no-restore --filter FullyQualifiedName~InspectionTaskServiceDataSafetyTests
```

Expected: all tests in `InspectionTaskServiceDataSafetyTests` pass.

- [ ] **Step 3: Check the backend diff**

Run:

```bash
git diff --check -- Backend/Services/InspectionTaskService.cs Backend.Tests/InspectionTaskServiceDataSafetyTests.cs
```

Expected: no whitespace errors.

### Task 3: Restore the Frontend Selectors

**Files:**
- Modify: `Frontend/src/pages/TasksPage.tsx`

- [ ] **Step 1: Enable inline task editing**

Change the inline selector from:

```tsx
<Select disabled size="small" style={{ width: 90 }} options={[{ value: true, label: 'Charged' }, { value: false, label: 'Free' }]} />
```

to:

```tsx
<Select size="small" style={{ width: 90 }} options={[{ value: true, label: 'Charged' }, { value: false, label: 'Free' }]} />
```

- [ ] **Step 2: Enable selection when creating a task**

Change the add-task selector from:

```tsx
<Select disabled options={[{ value: false, label: 'Free' }, { value: true, label: 'Charged' }]} />
```

to:

```tsx
<Select options={[{ value: false, label: 'Free' }, { value: true, label: 'Charged' }]} />
```

Keep `fetchRecentRecords` unchanged so selecting a property still supplies the initial automatic suggestion.

- [ ] **Step 3: Run frontend validation**

Run:

```bash
cd Frontend && npm run lint && npm run build
```

Expected: lint and TypeScript/Vite build both succeed.

### Task 4: Full Regression Verification

**Files:**
- Verify only; no source changes expected

- [ ] **Step 1: Run the complete backend suite**

Run:

```bash
dotnet test Backend.Tests/Backend.Tests.csproj --no-restore
```

Expected: all backend tests pass.

- [ ] **Step 2: Confirm no unintended schema changes**

Run:

```bash
dotnet ef migrations has-pending-model-changes --project Backend/InspectionApi.csproj
```

Expected: no model changes since the latest migration.

- [ ] **Step 3: Review the final targeted diff**

Run:

```bash
git diff --check
git diff -- Backend/Services/InspectionTaskService.cs Backend.Tests/InspectionTaskServiceDataSafetyTests.cs Frontend/src/pages/TasksPage.tsx
```

Expected: only the manual billing-choice behavior, its regression tests, and the two enabled selectors are present in the relevant hunks.
