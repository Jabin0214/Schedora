using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface IAiInspectionService
    {
        Task<AiInspectionPolishResponseDto> PolishInspectionNotesAsync(
            AiInspectionPolishRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
