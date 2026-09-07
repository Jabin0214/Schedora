using System.Net;
using System.Text;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class AiInspectionServiceTests
{
    [Fact]
    public async Task PolishInspectionNotesReturnsCachedResultForIdenticalRequest()
    {
        var handler = new StubHttpMessageHandler("""
            {"choices":[{"message":{"content":"{\"englishGeneralText\":\"General Notes\\n- Overall Presentation: Test\",\"englishTenantText\":\"Tenant text\",\"englishLandlordText\":\"Owner text\",\"chineseReferenceText\":\"中文\",\"summary\":\"summary\"}"}}]}
            """);
        using var httpClient = new HttpClient(handler);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new AiInspectionService(
            httpClient,
            CreateConfig(),
            cache,
            NullLogger<AiInspectionService>.Instance);
        var request = new AiInspectionPolishRequestDto
        {
            Address = "12 Queen Street, Auckland",
            InspectionType = "Routine",
            Notes = "rangehood filter dirty",
            IsBillable = true
        };

        var first = await service.PolishInspectionNotesAsync(request);
        var second = await service.PolishInspectionNotesAsync(request);

        Assert.Equal("summary", first.Summary);
        Assert.Equal(first.EnglishGeneralText, second.EnglishGeneralText);
        Assert.Equal(1, handler.SendCount);
    }

    private static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Ai:ApiKey"] = "test-key",
                ["Ai:BaseUrl"] = "https://api.example.test",
                ["Ai:Model"] = "deepseek-v4-flash"
            })
            .Build();

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly string _responseBody;
        public int SendCount { get; private set; }

        public StubHttpMessageHandler(string responseBody)
        {
            _responseBody = responseBody;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            SendCount++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_responseBody, Encoding.UTF8, "application/json")
            });
        }
    }
}
