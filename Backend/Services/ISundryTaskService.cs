using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface ISundryTaskService
    {
        Task<IEnumerable<SundryTaskDto>> GetAllTasksAsync();
        Task<SundryTask?> GetTaskByIdAsync(int id);
        Task<SundryTaskDto> CreateTaskAsync(SundryTaskCreateDto dto);
        Task<bool> UpdateTaskAsync(int id, SundryTaskUpdateDto dto);
        Task<bool> DeleteTaskAsync(int id);
    }
}