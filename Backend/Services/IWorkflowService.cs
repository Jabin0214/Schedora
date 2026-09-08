using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface IWorkflowService
    {
        Task<IEnumerable<WorkflowDto>> GetMoveInsAsync(CancellationToken cancellationToken = default);
        Task<WorkflowDto> CreateMoveInAsync(WorkflowCreateDto dto, CancellationToken cancellationToken = default);
        Task<WorkflowDto?> UpdateMoveInAsync(int id, WorkflowUpdateDto dto, CancellationToken cancellationToken = default);
        Task<WorkflowDto> UpdateChecklistItemAsync(int id, string itemKey, WorkflowChecklistItemUpdateDto dto, CancellationToken cancellationToken = default);
        Task<bool> ArchiveAsync(int id, CancellationToken cancellationToken = default);
    }
}
