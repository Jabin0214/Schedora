using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class WorkflowServiceTests
{
    [Fact]
    public async Task CreateMoveInWorkflowUsesAddressAsIdentityAndSeedsChecklist()
    {
        await using var context = CreateContext();
        var service = CreateService(context);

        var created = await service.CreateMoveInAsync(new WorkflowCreateDto
        {
            Address = "8 Queen Street"
        });

        Assert.Equal("8 Queen Street", created.Address);
        Assert.Equal((int)WorkflowStage.DeclarationEmail, created.Stage);
        Assert.Equal(13, created.Items.Count);
        Assert.Equal("send-declaration-email", created.Items[0].Key);
        Assert.All(created.Items, item => Assert.False(item.IsCompleted));
    }

    [Fact]
    public async Task CreateMoveInWorkflowRejectsDuplicateActiveAddress()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        await service.CreateMoveInAsync(new WorkflowCreateDto { Address = "8 Queen Street" });

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateMoveInAsync(new WorkflowCreateDto { Address = " 8 Queen Street " }));

        Assert.Contains("already has an active move in workflow", ex.Message);
    }

    [Fact]
    public async Task UpdateChecklistItemPersistsCompletionAndAdvancesStage()
    {
        await using var context = CreateContext();
        var service = CreateService(context);
        var created = await service.CreateMoveInAsync(new WorkflowCreateDto
        {
            Address = "8 Queen Street"
        });

        await service.UpdateChecklistItemAsync(
            created.Id,
            "send-declaration-email",
            new WorkflowChecklistItemUpdateDto { IsCompleted = true });

        var updated = await service.UpdateChecklistItemAsync(
            created.Id,
            "receive-declaration-reply",
            new WorkflowChecklistItemUpdateDto { IsCompleted = true });

        Assert.True(updated.Items.Single(i => i.Key == "receive-declaration-reply").IsCompleted);
        Assert.Equal((int)WorkflowStage.DraftPack, updated.Stage);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static WorkflowService CreateService(AppDbContext context) =>
        new(context, NullLogger<WorkflowService>.Instance);
}
