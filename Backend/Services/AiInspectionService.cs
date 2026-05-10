using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public class AiInspectionService : IAiInspectionService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<AiInspectionService> _logger;

        public AiInspectionService(
            HttpClient httpClient,
            IConfiguration config,
            ILogger<AiInspectionService> logger)
        {
            _httpClient = httpClient;
            _config = config;
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

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                model,
                temperature = 0.2,
                max_tokens = 800,
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
            var result = JsonSerializer.Deserialize<AiInspectionPolishResponseDto>(content, JsonOptions);
            if (result == null)
                throw new InvalidOperationException("AI provider returned empty content.");

            return result;
        }

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
