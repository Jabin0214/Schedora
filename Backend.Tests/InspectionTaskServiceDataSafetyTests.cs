using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class InspectionTaskServiceDataSafetyTests
{
    [Fact]
    public async Task CompleteTaskPersistsManualBillingChoiceEvenWhenPolicySuggestsFree()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        var property = new Property
        {
            Address = "12 Test Street",
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
            IsBillable = true
        };
        context.InspectionTasks.Add(task);
        await context.SaveChangesAsync();

        await service.CompleteTaskAsync(task.Id, new TaskCompletionDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00"
        });

        var completedRecord = await context.InspectionRecords
            .Where(r => r.PropertyId == property.Id)
            .OrderByDescending(r => r.ExecutionDate)
            .FirstAsync();
        Assert.True(completedRecord.IsCharged);
        Assert.Empty(await context.InspectionTasks.ToListAsync());
    }

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

    [Fact]
    public async Task CreateTaskRejectsMissingTaskType()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        context.Properties.Add(new Property
        {
            Address = "34 Test Avenue",
            BillingPolicy = BillingPolicy.ThreeMonthToggle
        });
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateTaskAsync(new InspectionTaskCreateDto
            {
                PropertyId = 1,
                Type = 99,
                ScheduledAt = "2026-06-10T10:00:00+12:00",
                IsBillable = true
            }));

        Assert.Contains("任务类型", ex.Message);
        Assert.Empty(await context.InspectionTasks.ToListAsync());
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static InspectionTaskService CreateService(AppDbContext context)
    {
        var provider = new ServiceCollection()
            .AddSingleton<IGoogleSyncService, NoopGoogleSyncService>()
            .BuildServiceProvider();

        return new InspectionTaskService(
            context,
            NullLogger<InspectionTaskService>.Instance,
            provider.GetRequiredService<IServiceScopeFactory>());
    }

    private sealed class NoopGoogleSyncService : IGoogleSyncService
    {
        public Task SyncTaskToCalendarAsync(InspectionTask task, string action) => Task.CompletedTask;
        public Task SyncAllTasksToSheetsAsync() => Task.CompletedTask;
        public Task SyncAllTasksToCalendarAsync() => Task.CompletedTask;
    }
}
