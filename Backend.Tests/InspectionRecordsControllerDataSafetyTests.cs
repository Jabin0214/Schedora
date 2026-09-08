using InspectionApi.Controllers;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class InspectionRecordsControllerDataSafetyTests
{
    [Fact]
    public async Task UpdateInspectionRecordRejectsMissingTaskType()
    {
        await using var context = CreateContext();
        var property = new Property
        {
            Address = "56 Test Road",
            BillingPolicy = BillingPolicy.ThreeMonthToggle
        };
        context.Properties.Add(property);
        await context.SaveChangesAsync();
        context.InspectionRecords.Add(new InspectionRecord
        {
            PropertyId = property.Id,
            ExecutionDate = DateTimeOffset.Parse("2026-06-10T10:00:00+12:00"),
            Type = InspectionType.Routine,
            IsCharged = true
        });
        await context.SaveChangesAsync();

        var controller = new InspectionRecordsController(
            context,
            NullLogger<InspectionRecordsController>.Instance);

        var result = await controller.UpdateInspectionRecord(1, new InspectionRecordUpdateDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00",
            Type = 99,
            IsCharged = false
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("任务类型", badRequest.Value?.ToString());
    }

    [Fact]
    public async Task UpdateInspectionRecordPersistsValidWorkUnits()
    {
        await using var context = CreateContext();
        var property = new Property
        {
            Address = "58 Far Road",
            BillingPolicy = BillingPolicy.ThreeMonthToggle
        };
        context.Properties.Add(property);
        context.TaskTypes.Add(new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 });
        await context.SaveChangesAsync();
        context.InspectionRecords.Add(new InspectionRecord
        {
            PropertyId = property.Id,
            ExecutionDate = DateTimeOffset.Parse("2026-06-10T10:00:00+12:00"),
            Type = InspectionType.Routine,
            IsCharged = true,
            WorkUnits = 1
        });
        await context.SaveChangesAsync();

        var controller = new InspectionRecordsController(
            context,
            NullLogger<InspectionRecordsController>.Instance);

        var result = await controller.UpdateInspectionRecord(1, new InspectionRecordUpdateDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00",
            Type = 2,
            IsCharged = true,
            WorkUnits = 2
        });

        Assert.IsType<NoContentResult>(result);
        Assert.Equal(2, (await context.InspectionRecords.SingleAsync()).WorkUnits);
    }

    [Fact]
    public async Task UpdateInspectionRecordRejectsInvalidWorkUnits()
    {
        await using var context = CreateContext();
        var property = new Property
        {
            Address = "60 Near Road",
            BillingPolicy = BillingPolicy.ThreeMonthToggle
        };
        context.Properties.Add(property);
        context.TaskTypes.Add(new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 });
        await context.SaveChangesAsync();
        context.InspectionRecords.Add(new InspectionRecord
        {
            PropertyId = property.Id,
            ExecutionDate = DateTimeOffset.Parse("2026-06-10T10:00:00+12:00"),
            Type = InspectionType.Routine,
            IsCharged = true,
            WorkUnits = 1
        });
        await context.SaveChangesAsync();

        var controller = new InspectionRecordsController(
            context,
            NullLogger<InspectionRecordsController>.Instance);

        var result = await controller.UpdateInspectionRecord(1, new InspectionRecordUpdateDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00",
            Type = 2,
            IsCharged = true,
            WorkUnits = 3
        });

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("工时", badRequest.Value?.ToString());
        Assert.Equal(1, (await context.InspectionRecords.SingleAsync()).WorkUnits);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
