using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace InspectionApi.Services
{
    public class AiTaskDraftService : IAiTaskDraftService
    {
        private readonly AppDbContext _context;
        private readonly IAiTaskDraftExtractor _extractor;
        private readonly ILogger<AiTaskDraftService> _logger;

        public AiTaskDraftService(
            AppDbContext context,
            IAiTaskDraftExtractor extractor,
            ILogger<AiTaskDraftService> logger)
        {
            _context = context;
            _extractor = extractor;
            _logger = logger;
        }

        public async Task<AiTaskDraftResponseDto> CreateDraftAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var extracted = await _extractor.ExtractAsync(request, cancellationToken);
            var addressQuery = extracted.AddressQuery?.Trim() ?? string.Empty;
            var candidates = await FindPropertyCandidatesAsync(addressQuery, cancellationToken);
            var typeId = await ResolveTaskTypeAsync(extracted.TypeName, cancellationToken);

            var response = new AiTaskDraftResponseDto
            {
                Status = candidates.Count == 1 ? "ready" : "needsConfirmation",
                Type = typeId,
                IsBillable = extracted.IsBillable ?? false,
                Notes = string.IsNullOrWhiteSpace(extracted.Notes) ? null : extracted.Notes.Trim(),
                AddressQuery = addressQuery,
                PropertyCandidates = candidates
            };

            if (TryParseScheduledAt(extracted.ScheduledAtIso, out var scheduledAt))
                response.ScheduledAt = scheduledAt.ToString("O");

            if (candidates.Count == 1)
            {
                response.PropertyId = candidates[0].PropertyId;
                response.PropertyAddress = candidates[0].Address;
            }

            _logger.LogInformation(
                "AI task draft created with status {Status} and {CandidateCount} property candidates",
                response.Status,
                candidates.Count);

            return response;
        }

        private async Task<int> ResolveTaskTypeAsync(string? typeName, CancellationToken cancellationToken)
        {
            var taskTypes = await _context.TaskTypes
                .OrderBy(t => t.DisplayOrder)
                .ToListAsync(cancellationToken);

            if (taskTypes.Count == 0)
                return (int)InspectionType.Other;

            var normalized = Normalize(typeName ?? string.Empty);
            var alias = normalized switch
            {
                "routine" or "regular" or "inspection" or "例行" or "常规" => "routine",
                "movein" or "move in" or "入住" => "movein",
                "moveout" or "move out" or "退租" or "搬出" => "moveout",
                _ => normalized
            };

            var matched = taskTypes.FirstOrDefault(t => Normalize(t.Name) == alias)
                ?? taskTypes.FirstOrDefault(t => Normalize(t.Name).Replace(" ", "") == alias.Replace(" ", ""));
            if (matched != null)
                return matched.Id;

            return taskTypes.FirstOrDefault(t => Normalize(t.Name) == "other")?.Id
                ?? taskTypes[0].Id;
        }

        private async Task<List<AiTaskDraftPropertyCandidateDto>> FindPropertyCandidatesAsync(
            string? addressQuery,
            CancellationToken cancellationToken)
        {
            var query = Normalize(addressQuery ?? string.Empty);
            if (string.IsNullOrWhiteSpace(query))
                return new List<AiTaskDraftPropertyCandidateDto>();

            var queryTokens = Tokenize(query);
            var properties = await _context.Properties
                .OrderBy(p => p.Address)
                .ToListAsync(cancellationToken);

            return properties
                .Select(p => new
                {
                    Property = p,
                    Score = ScoreAddressMatch(query, queryTokens, Normalize(p.Address), Tokenize(p.Address))
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Property.Address)
                .Take(5)
                .Select(x => new AiTaskDraftPropertyCandidateDto
                {
                    PropertyId = x.Property.Id,
                    Address = x.Property.Address,
                    BillingPolicy = x.Property.BillingPolicy.ToString()
                })
                .ToList();
        }

        private static int ScoreAddressMatch(
            string query,
            IReadOnlyList<string> queryTokens,
            string address,
            IReadOnlyList<string> addressTokens)
        {
            if (address.Contains(query, StringComparison.Ordinal))
                return 100 + query.Length;

            if (queryTokens.Count == 0)
                return 0;

            var matchedTokens = queryTokens.Count(token =>
                addressTokens.Any(addressToken => addressToken.Contains(token, StringComparison.Ordinal)));

            if (matchedTokens == 0)
                return 0;

            return matchedTokens == queryTokens.Count
                ? 70 + matchedTokens * 10
                : matchedTokens * 10;
        }

        private static bool TryParseScheduledAt(string? value, out DateTimeOffset scheduledAt)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                scheduledAt = default;
                return false;
            }

            return DateTimeOffset.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out scheduledAt);
        }

        private static string Normalize(string value) =>
            Regex.Replace(value.Trim().ToLowerInvariant(), @"\s+", " ");

        private static IReadOnlyList<string> Tokenize(string value) =>
            Regex.Split(Normalize(value), @"[^a-z0-9\u4e00-\u9fff]+")
                .Where(token => token.Length > 0)
                .ToArray();
    }

    public class AiTaskDraftExtractor : IAiTaskDraftExtractor
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<AiTaskDraftExtractor> _logger;

        public AiTaskDraftExtractor(
            HttpClient httpClient,
            IConfiguration config,
            ILogger<AiTaskDraftExtractor> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public async Task<AiTaskDraftExtractedFields> ExtractAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var apiKey = _config["Ai:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("AI API key is not configured.");

            var baseUrl = (_config["Ai:BaseUrl"] ?? "https://api.deepseek.com").TrimEnd('/');
            var model = _config["Ai:Model"] ?? "deepseek-chat";

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var now = DateTimeOffset.Now;
            var payload = new
            {
                model,
                temperature = 0.1,
                max_tokens = 500,
                response_format = new { type = "json_object" },
                messages = new[]
                {
                    new { role = "system", content = BuildSystemPrompt() },
                    new
                    {
                        role = "user",
                        content = $"Current local time: {now:O}\nTask instruction: {request.Text}"
                    }
                }
            };

            httpRequest.Content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOptions),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI task draft request failed with {StatusCode}: {Body}",
                    (int)response.StatusCode,
                    responseBody);
                throw new InvalidOperationException("AI provider request failed.");
            }

            var content = ExtractAssistantContent(responseBody);
            var fields = JsonSerializer.Deserialize<AiTaskDraftExtractedFields>(content, JsonOptions);
            if (fields == null)
                throw new InvalidOperationException("AI provider returned empty content.");

            return fields;
        }

        private static string BuildSystemPrompt() =>
            """
            You extract inspection task details from short English or Chinese instructions.
            Return only JSON with these camelCase fields:
            - addressQuery: the shortest useful property/address clue from the user, never invent a full address
            - scheduledAtIso: ISO 8601 date-time with offset when the user gave a clear time; otherwise null
            - typeName: one of Move In, Move Out, Routine, Other when clear; otherwise Other
            - isBillable: true for charged/billable, false for free/not charged, null if not mentioned
            - notes: task notes that are not address, date, type, or billing; null if none
            Use the supplied current local time to resolve relative dates like tomorrow. Do not choose a property ID.
            """;

        private static string ExtractAssistantContent(string responseBody)
        {
            using var doc = JsonDocument.Parse(responseBody);
            var choices = doc.RootElement.GetProperty("choices");
            if (choices.GetArrayLength() == 0)
                throw new InvalidOperationException("AI provider returned no choices.");

            return choices[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?? throw new InvalidOperationException("AI provider returned empty message content.");
        }
    }
}
