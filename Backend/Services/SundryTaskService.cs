using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public class SundryTaskService : ISundryTaskService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SundryTaskService> _logger;

        public SundryTaskService(AppDbContext context, ILogger<SundryTaskService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<SundryTaskDto>> GetAllTasksAsync()
        {
            var tasks = await _context.SundryTasks.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return tasks.Select(t => new SundryTaskDto
            {
                Id = t.Id,
                Description = t.Description,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt.ToString("O"),
                ExecutionDate = t.ExecutionDate?.ToString("O")
            });
        }

        public async Task<SundryTaskDto> CreateTaskAsync(SundryTaskCreateDto dto)
        {
            var task = new SundryTask
            {
                Description = dto.Description,
                Notes = dto.Notes,
                ExecutionDate = string.IsNullOrEmpty(dto.ExecutionDate) ? null : DateTime.Parse(dto.ExecutionDate, null, System.Globalization.DateTimeStyles.RoundtripKind)
            };

            _context.SundryTasks.Add(task);
            await _context.SaveChangesAsync();
            _logger.LogInformation("新增杂活成功, ID: {Id}", task.Id);

            return new SundryTaskDto
            {
                Id = task.Id,
                Description = task.Description,
                Notes = task.Notes,
                CreatedAt = task.CreatedAt.ToString("O"),
                ExecutionDate = task.ExecutionDate?.ToString("O")
            };
        }

        public async Task<bool> UpdateTaskAsync(int id, SundryTaskUpdateDto dto)
        {
            var task = await _context.SundryTasks.FindAsync(id);
            if (task == null) return false;

            task.Description = dto.Description;
            task.Notes = dto.Notes;
            task.ExecutionDate = string.IsNullOrEmpty(dto.ExecutionDate) ? null : DateTime.Parse(dto.ExecutionDate, null, System.Globalization.DateTimeStyles.RoundtripKind);

            await _context.SaveChangesAsync();
            _logger.LogInformation("更新杂活成功, ID: {Id}", id);
            return true;
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            var task = await _context.SundryTasks.FindAsync(id);
            if (task == null) return false;

            _context.SundryTasks.Remove(task);
            await _context.SaveChangesAsync();
            _logger.LogInformation("删除杂活成功, ID: {Id}", id);
            return true;
        }
    }
}
