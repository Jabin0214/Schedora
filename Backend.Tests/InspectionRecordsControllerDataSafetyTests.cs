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

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
