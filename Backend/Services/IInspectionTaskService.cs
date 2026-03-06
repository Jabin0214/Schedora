using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface IInspectionTaskService
    {
        Task<IEnumerable<InspectionTaskDto>> GetAllTasksAsync(CancellationToken cancellationToken = default);
        Task<InspectionTaskDto> CreateTaskAsync(InspectionTaskCreateDto dto);
        Task<bool> UpdateTaskAsync(int id, InspectionTaskUpdateDto dto);
        Task<bool> DeleteTaskAsync(int id);
        Task CompleteTaskAsync(int id, TaskCompletionDto dto);
    }
}
