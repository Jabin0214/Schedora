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
            var extracted = TryExtractLocally(request.Text)
                ?? await _extractor.ExtractAsync(request, cancellationToken);
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

        private static AiTaskDraftExtractedFields? TryExtractLocally(string text)
        {
            var normalized = Normalize(text);
            if (!TryExtractAddressQuery(text, out var addressQuery))
                return null;

            if (!TryExtractTaskType(normalized, out var typeName))
                return null;

            if (!TryExtractScheduledAt(normalized, out var scheduledAt))
                return null;

            return new AiTaskDraftExtractedFields
            {
                AddressQuery = addressQuery,
                ScheduledAtIso = scheduledAt.ToString("O"),
                TypeName = typeName,
                IsBillable = TryExtractBilling(normalized),
                Notes = null
            };
        }

        private static bool TryExtractAddressQuery(string text, out string addressQuery)
        {
            var match = Regex.Match(text, @"\b\d+[A-Za-z]?/\d+[A-Za-z]?\b");
            if (!match.Success)
                match = Regex.Match(text, @"\b\d+[A-Za-z]?\b");

            addressQuery = match.Success ? match.Value : string.Empty;
            return match.Success;
        }

        private static bool TryExtractTaskType(string normalized, out string typeName)
        {
            if (normalized.Contains("例行") || normalized.Contains("routine"))
            {
                typeName = "Routine";
                return true;
            }

            if (normalized.Contains("搬入") || normalized.Contains("入住") || normalized.Contains("move in") || normalized.Contains("movein"))
            {
                typeName = "Move In";
                return true;
            }

            if (normalized.Contains("搬出") || normalized.Contains("退租") || normalized.Contains("move out") || normalized.Contains("moveout"))
            {
                typeName = "Move Out";
                return true;
            }

            typeName = string.Empty;
            return false;
        }

        private static bool? TryExtractBilling(string normalized)
        {
            if (normalized.Contains("不收费") || normalized.Contains("免费") || normalized.Contains("not billable") || normalized.Contains("free"))
                return false;

            if (normalized.Contains("收费") || normalized.Contains("billable") || normalized.Contains("charge"))
                return true;

            return false;
        }

        private static bool TryExtractScheduledAt(string normalized, out DateTimeOffset scheduledAt)
        {
            scheduledAt = default;
            if (!TryExtractDay(normalized, out var date))
                return false;

            if (!TryExtractTime(normalized, out var time))
                return false;

            scheduledAt = new DateTimeOffset(
                date.Year,
                date.Month,
                date.Day,
                time.Hour,
                time.Minute,
                0,
                DateTimeOffset.Now.Offset);
            return true;
        }

        private static bool TryExtractDay(string normalized, out DateOnly date)
        {
            var today = DateOnly.FromDateTime(DateTimeOffset.Now.DateTime);
            if (normalized.Contains("今天"))
            {
                date = today;
                return true;
            }

            if (normalized.Contains("明天"))
            {
                date = today.AddDays(1);
                return true;
            }

            var weekdays = new Dictionary<string, DayOfWeek>
            {
                ["周一"] = DayOfWeek.Monday,
                ["星期一"] = DayOfWeek.Monday,
                ["周二"] = DayOfWeek.Tuesday,
                ["星期二"] = DayOfWeek.Tuesday,
                ["周三"] = DayOfWeek.Wednesday,
                ["星期三"] = DayOfWeek.Wednesday,
                ["周四"] = DayOfWeek.Thursday,
                ["星期四"] = DayOfWeek.Thursday,
                ["周五"] = DayOfWeek.Friday,
                ["星期五"] = DayOfWeek.Friday,
                ["周六"] = DayOfWeek.Saturday,
                ["星期六"] = DayOfWeek.Saturday,
                ["周日"] = DayOfWeek.Sunday,
                ["周天"] = DayOfWeek.Sunday,
                ["星期日"] = DayOfWeek.Sunday,
                ["星期天"] = DayOfWeek.Sunday
            };

            foreach (var (token, dayOfWeek) in weekdays)
            {
                if (!normalized.Contains(token))
                    continue;

                var daysAhead = ((int)dayOfWeek - (int)today.DayOfWeek + 7) % 7;
                if (daysAhead == 0)
                    daysAhead = 7;

                date = today.AddDays(daysAhead);
                return true;
            }

            date = default;
            return false;
        }

        private static bool TryExtractTime(string normalized, out TimeOnly time)
        {
            var chinese = Regex.Match(normalized, @"(?<period>上午|早上|下午|晚上)?(?<hour>[一二三四五六七八九十两]{1,3})点(?<half>半)?");
            if (chinese.Success && TryParseChineseHour(chinese.Groups["hour"].Value, out var chineseHour))
            {
                var chineseMinute = chinese.Groups["half"].Success ? 30 : 0;
                var period = chinese.Groups["period"].Value;
                if ((period == "下午" || period == "晚上") && chineseHour < 12)
                    chineseHour += 12;
                else if ((period == "上午" || period == "早上") && chineseHour == 12)
                    chineseHour = 0;

                time = new TimeOnly(chineseHour, chineseMinute);
                return true;
            }

            var numeric = Regex.Match(normalized, @"(?<hour>\d{1,2})(:(?<minute>\d{2})|\s*(点|pm|am))");
            if (!numeric.Success || !int.TryParse(numeric.Groups["hour"].Value, out var hour))
            {
                time = default;
                return false;
            }

            var minute = numeric.Groups["minute"].Success
                ? int.Parse(numeric.Groups["minute"].Value, CultureInfo.InvariantCulture)
                : 0;

            if ((normalized.Contains("下午") || normalized.Contains("晚上") || normalized.Contains("pm")) && hour < 12)
                hour += 12;
            else if ((normalized.Contains("上午") || normalized.Contains("早上") || normalized.Contains("am")) && hour == 12)
                hour = 0;

            if (hour is < 0 or > 23 || minute is < 0 or > 59)
            {
                time = default;
                return false;
            }

            time = new TimeOnly(hour, minute);
            return true;
        }

        private static bool TryParseChineseHour(string value, out int hour)
        {
            var map = new Dictionary<char, int>
            {
                ['一'] = 1,
                ['二'] = 2,
                ['两'] = 2,
                ['三'] = 3,
                ['四'] = 4,
                ['五'] = 5,
                ['六'] = 6,
                ['七'] = 7,
                ['八'] = 8,
                ['九'] = 9
            };

            if (value == "十")
            {
                hour = 10;
                return true;
            }

            if (value.StartsWith('十') && value.Length == 2 && map.TryGetValue(value[1], out var afterTen))
            {
                hour = 10 + afterTen;
                return true;
            }

            if (value.EndsWith('十') && value.Length == 2 && map.TryGetValue(value[0], out var beforeTen))
            {
                hour = beforeTen * 10;
                return hour <= 23;
            }

            if (value.Length == 3 && value[1] == '十' && map.TryGetValue(value[0], out var tens) && map.TryGetValue(value[2], out var ones))
            {
                hour = tens * 10 + ones;
                return hour <= 23;
            }

            if (value.Length == 1 && map.TryGetValue(value[0], out hour))
                return true;

            hour = default;
            return false;
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
            const int maxAttempts = 2;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    return await ExtractOnceAsync(request, cancellationToken);
                }
                catch (InvalidOperationException ex) when (attempt < maxAttempts && IsRetryableContentFailure(ex))
                {
                    _logger.LogWarning(
                        ex,
                        "AI task draft returned invalid assistant content; retrying once");
                }
            }

            throw new InvalidOperationException("AI provider request failed.");
        }

        private async Task<AiTaskDraftExtractedFields> ExtractOnceAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken)
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
                thinking = new { type = "disabled" },
                temperature = 0.1,
                max_tokens = 1000,
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
            AiTaskDraftExtractedFields? fields;
            try
            {
                fields = JsonSerializer.Deserialize<AiTaskDraftExtractedFields>(content, JsonOptions);
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException("AI provider returned invalid JSON content.", ex);
            }

            if (fields == null)
                throw new InvalidOperationException("AI provider returned empty content.");

            return fields;
        }

        private static bool IsRetryableContentFailure(InvalidOperationException ex) =>
            ex.Message is "AI provider returned empty message content."
                or "AI provider returned invalid JSON content."
                or "AI provider returned empty content.";

        private static string BuildSystemPrompt() =>
            """
            Extract inspection task fields from English or Chinese. Return json only.
            Fields: addressQuery shortest address clue, never full invented address; scheduledAtIso ISO 8601 with offset or null; typeName Move In, Move Out, Routine, or Other; isBillable true, false, or null; notes extra details or null.
            Use supplied current local time for relative dates. Do not choose property IDs.
            Example json:
            {
              "addressQuery": "811/32",
              "scheduledAtIso": "2026-07-28T15:00:00+12:00",
              "typeName": "Routine",
              "isBillable": null,
              "notes": null
            }
            """;

        private static string ExtractAssistantContent(string responseBody)
        {
            using var doc = JsonDocument.Parse(responseBody);
            var choices = doc.RootElement.GetProperty("choices");
            if (choices.GetArrayLength() == 0)
                throw new InvalidOperationException("AI provider returned no choices.");

            var content = choices[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?? throw new InvalidOperationException("AI provider returned empty message content.");

            if (string.IsNullOrWhiteSpace(content))
                throw new InvalidOperationException("AI provider returned empty message content.");

            return content;
        }
    }
}
