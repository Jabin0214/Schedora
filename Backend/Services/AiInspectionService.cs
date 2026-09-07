using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using InspectionApi.Models.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace InspectionApi.Services
{
    public class AiInspectionService : IAiInspectionService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;
        private readonly ILogger<AiInspectionService> _logger;

        public AiInspectionService(
            HttpClient httpClient,
            IConfiguration config,
            IMemoryCache cache,
            ILogger<AiInspectionService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _cache = cache;
            _logger = logger;
        }

        public async Task<AiInspectionPolishResponseDto> PolishInspectionNotesAsync(
            AiInspectionPolishRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var apiKey = _config["Ai:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("AI API key is not configured.");

            var baseUrl = (_config["Ai:BaseUrl"] ?? "https://api.deepseek.com").TrimEnd('/');
            var model = _config["Ai:Model"] ?? "deepseek-chat";
            var cacheKey = BuildCacheKey(request, model);
            if (_cache.TryGetValue(cacheKey, out AiInspectionPolishResponseDto? cached) && cached != null)
            {
                _logger.LogInformation("AI inspection polish cache hit");
                return cached;
            }

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                model,
                thinking = new { type = "disabled" },
                temperature = 0.2,
                max_tokens = 1200,
                response_format = new { type = "json_object" },
                messages = new[]
                {
                    new { role = "system", content = AiInspectionPromptBuilder.SystemPrompt },
                    new { role = "user", content = AiInspectionPromptBuilder.BuildUserPrompt(request) }
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
                    "AI inspection polish request failed with {StatusCode}: {Body}",
                    (int)response.StatusCode,
                    responseBody);
                throw new InvalidOperationException("AI provider request failed.");
            }

            var content = ExtractAssistantContent(responseBody);
            AiInspectionPolishResponseDto? result;
            try
            {
                result = JsonSerializer.Deserialize<AiInspectionPolishResponseDto>(content, JsonOptions);
            }
            catch (JsonException ex)
            {
                throw new InvalidOperationException("AI provider returned invalid JSON content.", ex);
            }

            if (result == null)
                throw new InvalidOperationException("AI provider returned empty content.");

            NormalizeResultForOutputMode(request, result);
            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }

        private static string BuildCacheKey(
            AiInspectionPolishRequestDto request,
            string model)
        {
            var raw = JsonSerializer.Serialize(new
            {
                model,
                outputMode = NormalizeOutputMode(request.OutputMode),
                address = request.Address?.Trim() ?? string.Empty,
                inspectionType = request.InspectionType?.Trim() ?? string.Empty,
                notes = request.Notes.Trim(),
                request.IsBillable
            }, JsonOptions);
            var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
            return $"ai-inspection-polish:{hash}";
        }

        private static void NormalizeResultForOutputMode(
            AiInspectionPolishRequestDto request,
            AiInspectionPolishResponseDto result)
        {
            if (!string.Equals(NormalizeOutputMode(request.OutputMode), "generalOnly", StringComparison.Ordinal))
                return;

            result.EnglishTenantText = string.Empty;
            result.EnglishLandlordText = string.Empty;
            result.ChineseReferenceText = string.Empty;
        }

        private static string NormalizeOutputMode(string? outputMode) =>
            string.Equals(outputMode, "generalOnly", StringComparison.OrdinalIgnoreCase)
                ? "generalOnly"
                : "full";

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
