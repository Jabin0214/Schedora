using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public class InspectionTaskService : IInspectionTaskService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<InspectionTaskService> _logger;

        public InspectionTaskService(AppDbContext context, ILogger<InspectionTaskService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private bool ShouldCharge(Property property)
        {
            if (property.BillingPolicy == BillingPolicy.SixMonthFree)
            {
                return false;
            }

            if (!property.LastInspectionDate.HasValue)
                return true;

            return !property.LastInspectionWasCharged;
        }

        public async Task<IEnumerable<InspectionTaskDto>> GetAllTasksAsync(CancellationToken cancellationToken = default)
        {
            var tasks = await _context.InspectionTasks
                .Include(t => t.Property)
                .OrderByDescending(t => t.CreatedAt)
                .ThenByDescending(t => t.ScheduledAt)
                .Select(t => new InspectionTaskDto
                {
                    Id = t.Id,
                    PropertyId = t.PropertyId,
                    PropertyAddress = t.Property != null ? t.Property.Address : null,
                    ScheduledAt = t.ScheduledAt?.ToString("O"),
                    Type = t.Type.ToString(),
                    Status = t.Status.ToString(),
                    IsBillable = t.IsBillable,
                    Notes = t.Notes,
                    CreatedAt = t.CreatedAt.ToString("O"),
                    CompletedAt = t.CompletedAt?.ToString("O"),
                    LastInspectionDate = t.Property != null ? t.Property.LastInspectionDate?.ToString("O") : null,
                    LastInspectionType = t.Property?.LastInspectionType?.ToString(),
                    LastInspectionWasCharged = t.Property != null ? t.Property.LastInspectionWasCharged : false,
                    BillingPolicy = t.Property != null ? t.Property.BillingPolicy.ToString() : BillingPolicy.ThreeMonthToggle.ToString()
                })
                .ToListAsync(cancellationToken);

            return tasks;
        }

        public async Task<InspectionTask?> GetTaskByIdAsync(int id)
        {
            return await _context.InspectionTasks
                .Include(t => t.Property)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<InspectionTaskDto> CreateTaskAsync(InspectionTaskCreateDto dto)
        {
            var property = await _context.Properties.FindAsync(dto.PropertyId);
            if (property == null)
            {
                throw new ArgumentException("指定的物业不存在");
            }

            var task = new InspectionTask
            {
                PropertyId = dto.PropertyId,
                ScheduledAt = string.IsNullOrEmpty(dto.ScheduledAt) ? null : DateTime.Parse(dto.ScheduledAt),
                Type = Enum.Parse<InspectionType>(dto.Type),
                Status = Enum.Parse<InspectionStatus>(dto.Status),
                Notes = dto.Notes,
                IsBillable = ShouldCharge(property)
            };

            if (task.ScheduledAt.HasValue && task.Status == InspectionStatus.Pending)
            {
                task.Status = InspectionStatus.Ready;
            }

            _context.InspectionTasks.Add(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增任务成功, ID: {Id}, 类型: {Type}", task.Id, task.Type);

            return new InspectionTaskDto
            {
                Id = task.Id,
                PropertyId = task.PropertyId,
                PropertyAddress = property.Address,
                ScheduledAt = task.ScheduledAt?.ToString("O"),
                Type = task.Type.ToString(),
                Status = task.Status.ToString(),
                IsBillable = task.IsBillable,
                Notes = task.Notes,
                CreatedAt = task.CreatedAt.ToString("O"),
                CompletedAt = task.CompletedAt?.ToString("O"),
                BillingPolicy = property.BillingPolicy.ToString()
            };
        }

        public async Task<bool> UpdateTaskAsync(int id, InspectionTaskUpdateDto dto)
        {
            var existingTask = await _context.InspectionTasks.FindAsync(id);
            if (existingTask == null)
            {
                return false;
            }

            var property = await _context.Properties.FindAsync(dto.PropertyId);
            if (property == null)
            {
                throw new ArgumentException("指定的物业不存在");
            }

            existingTask.PropertyId = dto.PropertyId;
            existingTask.ScheduledAt = string.IsNullOrEmpty(dto.ScheduledAt) ? null : DateTime.Parse(dto.ScheduledAt);
            existingTask.Status = Enum.Parse<InspectionStatus>(dto.Status);
            existingTask.Notes = dto.Notes;
            existingTask.Type = Enum.Parse<InspectionType>(dto.Type);
            existingTask.IsBillable = ShouldCharge(property);

            if (existingTask.ScheduledAt.HasValue && existingTask.Status == InspectionStatus.Pending)
            {
                existingTask.Status = InspectionStatus.Ready;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("更新任务成功, ID: {Id}", id);
            return true;
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null)
            {
                return false;
            }

            _context.InspectionTasks.Remove(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除任务成功, ID: {Id}", id);
            return true;
        }

        public async Task<InspectionRecord> CompleteTaskAsync(int id, TaskCompletionDto dto)
        {
            var task = await _context.InspectionTasks
                .Include(t => t.Property)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (task == null)
            {
                throw new ArgumentException($"未找到ID为{id}的任务");
            }

            if (task.Status == InspectionStatus.Completed)
            {
                throw new InvalidOperationException("任务已完成，不能重复完成");
            }

            var executionDate = DateTime.Parse(dto.ExecutionDate);

            var inspectionRecord = new InspectionRecord
            {
                PropertyId = task.PropertyId,
                ExecutionDate = executionDate,
                Type = task.Type,
                IsCharged = task.IsBillable,
                Notes = dto.Notes,
                TaskId = task.Id
            };

            _context.InspectionRecords.Add(inspectionRecord);

            task.Status = InspectionStatus.Completed;
            task.CompletedAt = DateTime.UtcNow;

            if (task.Property != null)
            {
                task.Property.LastInspectionDate = executionDate;
                task.Property.LastInspectionType = task.Type;
                task.Property.LastInspectionWasCharged = task.IsBillable;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("完成任务成功, 任务ID: {TaskId}, 记录ID: {RecordId}", id, inspectionRecord.Id);
            return inspectionRecord;
        }
    }
}