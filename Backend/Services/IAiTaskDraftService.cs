using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface IAiTaskDraftService
    {
        Task<AiTaskDraftResponseDto> CreateDraftAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default);
    }

    public interface IAiTaskDraftExtractor
    {
        Task<AiTaskDraftExtractedFields> ExtractAsync(
            AiTaskDraftRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
