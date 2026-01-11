using System.Linq;
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
            var tasks = await _context.SundryTasks
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return tasks.Select(t => new SundryTaskDto
            {
                Id = t.Id,
                Description = t.Description,
                Notes = t.Notes,
                CreatedAt = t.CreatedAt.ToString("O"),
                ExecutionDate = t.ExecutionDate?.ToString("O")
            });
        }

        public async Task<SundryTask?> GetTaskByIdAsync(int id)
        {
            return await _context.SundryTasks.FindAsync(id);
        }

        public async Task<SundryTaskDto> CreateTaskAsync(SundryTaskCreateDto dto)
        {
            var task = new SundryTask
            {
                Description = dto.Description,
                Notes = dto.Notes,
                ExecutionDate = string.IsNullOrEmpty(dto.ExecutionDate) ? null : DateTime.Parse(dto.ExecutionDate)
            };

            _context.SundryTasks.Add(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增杂活成功, ID: {Id}, 描述: {Description}", task.Id, task.Description);

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
            var existingTask = await _context.SundryTasks.FindAsync(id);
            if (existingTask == null)
            {
                return false;
            }

            existingTask.Description = dto.Description;
            existingTask.Notes = dto.Notes;
            existingTask.ExecutionDate = string.IsNullOrEmpty(dto.ExecutionDate) ? null : DateTime.Parse(dto.ExecutionDate);

            await _context.SaveChangesAsync();

            _logger.LogInformation("更新杂活成功, ID: {Id}", id);
            return true;
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            var task = await _context.SundryTasks.FindAsync(id);
            if (task == null)
            {
                return false;
            }

            _context.SundryTasks.Remove(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除杂活成功, ID: {Id}", id);
            return true;
        }
    }
}