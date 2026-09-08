using System.Net;
using System.Text;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

    [Fact]
    public async Task CreateDraftUsesLocalParsingForClearChineseRoutineRequest()
    {
        await using var context = CreateContext();
        context.Properties.AddRange(
            new Property { Address = "811/32 Swanson street City Centre (Auckland City)", BillingPolicy = BillingPolicy.ThreeMonthToggle },
            new Property { Address = "1106/32 Swanson street City Centre (Auckland City)", BillingPolicy = BillingPolicy.ThreeMonthToggle });
        context.TaskTypes.AddRange(
            new TaskType { Id = 2, Name = "Routine", Color = "green", DisplayOrder = 0 },
            new TaskType { Id = 3, Name = "Other", Color = "default", DisplayOrder = 1 });
        await context.SaveChangesAsync();

        var extractor = new CountingExtractor(new AiTaskDraftExtractedFields
        {
            AddressQuery = "wrong",
            TypeName = "Other"
        });
        var service = new AiTaskDraftService(
            context,
            extractor,
            NullLogger<AiTaskDraftService>.Instance);

        var draft = await service.CreateDraftAsync(new AiTaskDraftRequestDto
        {
            Text = "811/32 周二下午三点例行检查"
        });

        Assert.Equal(0, extractor.CallCount);
        Assert.Equal("811/32", draft.AddressQuery);
        Assert.Equal(2, draft.Type);
        Assert.False(draft.IsBillable);
        var today = DateOnly.FromDateTime(DateTimeOffset.Now.DateTime);
        var daysUntilTuesday = ((int)DayOfWeek.Tuesday - (int)today.DayOfWeek + 7) % 7;
        if (daysUntilTuesday == 0)
            daysUntilTuesday = 7;
        var expectedDate = today.AddDays(daysUntilTuesday);
        var expectedScheduledAt = new DateTimeOffset(
            expectedDate.Year,
            expectedDate.Month,
            expectedDate.Day,
            15,
            0,
            0,
            DateTimeOffset.Now.Offset);
        Assert.Equal(expectedScheduledAt.ToString("O"), draft.ScheduledAt);
        Assert.Contains(draft.PropertyCandidates, candidate =>
            candidate.Address == "811/32 Swanson street City Centre (Auckland City)");
    }

    [Fact]
    public async Task CreateDraftFallsBackToAiForAmbiguousChineseRequest()
    {
        await using var context = CreateContext();
        context.TaskTypes.Add(new TaskType { Id = 3, Name = "Other", Color = "default", DisplayOrder = 0 });
        await context.SaveChangesAsync();

        var extractor = new CountingExtractor(new AiTaskDraftExtractedFields
        {
            AddressQuery = "811/32",
            TypeName = "Other",
            Notes = "看看"
        });
        var service = new AiTaskDraftService(
            context,
            extractor,
            NullLogger<AiTaskDraftService>.Instance);

        var draft = await service.CreateDraftAsync(new AiTaskDraftRequestDto
        {
            Text = "811/32 周二下午看看"
        });

        Assert.Equal(1, extractor.CallCount);
        Assert.Equal("看看", draft.Notes);
    }

    [Fact]
    public async Task ExtractorTreatsEmptyAssistantContentAsProviderFailure()
    {
        using var httpClient = new HttpClient(new StubHttpMessageHandler("""
            {"choices":[{"message":{"content":""}}]}
            """));
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Ai:ApiKey"] = "test-key",
                ["Ai:BaseUrl"] = "https://api.example.test",
                ["Ai:Model"] = "deepseek-v4-flash"
            })
            .Build();
        var extractor = new AiTaskDraftExtractor(
            httpClient,
            config,
            NullLogger<AiTaskDraftExtractor>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            extractor.ExtractAsync(new AiTaskDraftRequestDto
            {
                Text = "811/32 周二下午三点例行检查"
            }));

        Assert.Equal("AI provider returned empty message content.", ex.Message);
    }

    [Fact]
    public async Task ExtractorRetriesWhenAssistantContentIsInvalidJson()
    {
        var handler = new StubHttpMessageHandler(
            """
            {"choices":[{"message":{"content":"{\"addressQuery\":\"811/32\",\"scheduledAtIso\":\"2026-07"}}]}
            """,
            """
            {"choices":[{"message":{"content":"{\"addressQuery\":\"811/32\",\"scheduledAtIso\":\"2026-07-28T15:00:00+12:00\",\"typeName\":\"Routine\",\"isBillable\":null,\"notes\":null}"}}]}
            """);
        using var httpClient = new HttpClient(handler);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Ai:ApiKey"] = "test-key",
                ["Ai:BaseUrl"] = "https://api.example.test",
                ["Ai:Model"] = "deepseek-v4-flash"
            })
            .Build();
        var extractor = new AiTaskDraftExtractor(
            httpClient,
            config,
            NullLogger<AiTaskDraftExtractor>.Instance);

        var fields = await extractor.ExtractAsync(new AiTaskDraftRequestDto
        {
            Text = "811/32 周二下午三点例行检查"
        });

        Assert.Equal("811/32", fields.AddressQuery);
        Assert.Equal("2026-07-28T15:00:00+12:00", fields.ScheduledAtIso);
        Assert.Equal(2, handler.SendCount);
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

    private sealed class CountingExtractor : IAiTaskDraftExtractor
    {
        private readonly AiTaskDraftExtractedFields _fields;
        public int CallCount { get; private set; }

        public CountingExtractor(AiTaskDraftExtractedFields fields)
        {
            _fields = fields;
        }

        public Task<AiTaskDraftExtractedFields> ExtractAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            return Task.FromResult(_fields);
        }
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Queue<string> _responseBodies;
        public int SendCount { get; private set; }

        public StubHttpMessageHandler(params string[] responseBodies)
        {
            _responseBodies = new Queue<string>(responseBodies);
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            SendCount++;
            var responseBody = _responseBodies.Count > 1
                ? _responseBodies.Dequeue()
                : _responseBodies.Peek();

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
            });
        }
    }
}
