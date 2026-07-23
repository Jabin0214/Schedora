using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class AiTaskDraftServiceTests
{
    [Fact]
    public async Task CreateDraftReturnsPropertyCandidatesForPartialAddress()
    {
        await using var context = CreateContext();
        context.Properties.AddRange(
            new Property { Address = "12 Queen Street, Auckland", BillingPolicy = BillingPolicy.ThreeMonthToggle },
            new Property { Address = "88 Queen Street, Auckland", BillingPolicy = BillingPolicy.SixMonthFree },
            new Property { Address = "45 King Road, Auckland", BillingPolicy = BillingPolicy.ThreeMonthToggle });
        context.TaskTypes.AddRange(
            new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 },
            new TaskType { Id = 3, Name = "Other", Color = "default", DisplayOrder = 1 });
        await context.SaveChangesAsync();

        var service = new AiTaskDraftService(
            context,
            new FakeExtractor(new AiTaskDraftExtractedFields
            {
                AddressQuery = "queen",
                TypeName = "routine",
                IsBillable = false,
                Notes = "Bring keys"
            }),
            NullLogger<AiTaskDraftService>.Instance);

        var draft = await service.CreateDraftAsync(new AiTaskDraftRequestDto
        {
            Text = "routine for queen, bring keys"
        });

        Assert.Equal("needsConfirmation", draft.Status);
        Assert.Equal(2, draft.Type);
        Assert.False(draft.IsBillable);
        Assert.Equal("Bring keys", draft.Notes);
        Assert.Equal(new[] { "12 Queen Street, Auckland", "88 Queen Street, Auckland" },
            draft.PropertyCandidates.Select(c => c.Address).ToArray());
    }

    [Fact]
    public async Task CreateDraftMarksReadyWhenOnlyOnePropertyMatches()
    {
        await using var context = CreateContext();
        context.Properties.AddRange(
            new Property { Address = "12 Queen Street, Auckland", BillingPolicy = BillingPolicy.ThreeMonthToggle },
            new Property { Address = "45 King Road, Auckland", BillingPolicy = BillingPolicy.ThreeMonthToggle });
        context.TaskTypes.Add(new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 });
        await context.SaveChangesAsync();

        var service = new AiTaskDraftService(
            context,
            new FakeExtractor(new AiTaskDraftExtractedFields
            {
                AddressQuery = "queen",
                TypeName = "routine",
                ScheduledAtIso = "2026-07-14T15:00:00+12:00",
                IsBillable = true
            }),
            NullLogger<AiTaskDraftService>.Instance);

        var draft = await service.CreateDraftAsync(new AiTaskDraftRequestDto
        {
            Text = "routine tomorrow 3pm for queen"
        });

        Assert.Equal("ready", draft.Status);
        Assert.Single(draft.PropertyCandidates);
        Assert.Equal(draft.PropertyCandidates[0].PropertyId, draft.PropertyId);
        Assert.Equal("2026-07-14T15:00:00.0000000+12:00", draft.ScheduledAt);
    }

    [Fact]
    public async Task CreateDraftReturnsEditableDraftWhenAiDoesNotFindAddress()
    {
        await using var context = CreateContext();
        context.Properties.Add(new Property
        {
            Address = "12 Queen Street, Auckland",
            BillingPolicy = BillingPolicy.ThreeMonthToggle
        });
        context.TaskTypes.AddRange(
            new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 },
            new TaskType { Id = 3, Name = "Other", Color = "default", DisplayOrder = 1 });
        await context.SaveChangesAsync();

        var service = new AiTaskDraftService(
            context,
            new FakeExtractor(new AiTaskDraftExtractedFields
            {
                AddressQuery = null!,
                TypeName = "routine",
                ScheduledAtIso = "2026-07-23T10:00:00+12:00",
                IsBillable = true,
                Notes = "Call tenant first"
            }),
            NullLogger<AiTaskDraftService>.Instance);

        var draft = await service.CreateDraftAsync(new AiTaskDraftRequestDto
        {
            Text = "routine tomorrow, call tenant first"
        });

        Assert.Equal("needsConfirmation", draft.Status);
        Assert.Null(draft.PropertyId);
        Assert.Empty(draft.AddressQuery);
        Assert.Empty(draft.PropertyCandidates);
        Assert.Equal(2, draft.Type);
        Assert.True(draft.IsBillable);
        Assert.Equal("Call tenant first", draft.Notes);
        Assert.Equal("2026-07-23T10:00:00.0000000+12:00", draft.ScheduledAt);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed class FakeExtractor : IAiTaskDraftExtractor
    {
        private readonly AiTaskDraftExtractedFields _fields;

        public FakeExtractor(AiTaskDraftExtractedFields fields)
        {
            _fields = fields;
        }

        public Task<AiTaskDraftExtractedFields> ExtractAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default) => Task.FromResult(_fields);
    }
}
