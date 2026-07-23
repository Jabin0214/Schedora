using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public class InspectionTaskService : IInspectionTaskService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<InspectionTaskService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public InspectionTaskService(AppDbContext context, ILogger<InspectionTaskService> logger, IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        // Run Google sync in a fresh DI scope so its scoped DbContext outlives the HTTP request
        private void FireAndForgetSync(InspectionTask task, string action)
        {
            var taskId = task.Id;
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var sync = scope.ServiceProvider.GetRequiredService<IGoogleSyncService>();
                    await sync.SyncTaskToCalendarAsync(task, action);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Google 同步未预期失败, 任务 ID: {Id}", taskId);
                }
            });
        }

        // Parse any ISO 8601 string to DateTimeOffset — no Kind issues, maps directly to timestamptz
        private static DateTimeOffset ParseDate(string iso) =>
            DateTimeOffset.Parse(iso, null, System.Globalization.DateTimeStyles.RoundtripKind);

        private async Task EnsureTaskTypeExistsAsync(int typeId, CancellationToken cancellationToken = default)
        {
            var exists = await _context.TaskTypes.AnyAsync(t => t.Id == typeId, cancellationToken);
            if (!exists)
                throw new ArgumentException($"指定的任务类型不存在: {typeId}");
        }

        private static InspectionTaskDto ToDto(InspectionTask t, string billingPolicy) => new()
        {
            Id = t.Id,
            PropertyId = t.PropertyId,
            PropertyAddress = t.Property?.Address,
            ScheduledAt = t.ScheduledAt?.ToString("O"),
            Type = (int)t.Type,
            IsBillable = t.IsBillable,
            Notes = t.Notes,
            BillingPolicy = billingPolicy
        };

        public async Task<IEnumerable<InspectionTaskDto>> GetAllTasksAsync(CancellationToken cancellationToken = default)
        {
            var tasks = await _context.InspectionTasks
                .Include(t => t.Property)
                .OrderByDescending(t => t.ScheduledAt)
                .ToListAsync(cancellationToken);

            return tasks.Select(t => ToDto(t, t.Property?.BillingPolicy.ToString() ?? nameof(BillingPolicy.ThreeMonthToggle)));
        }

        public async Task<InspectionTaskDto> CreateTaskAsync(InspectionTaskCreateDto dto)
        {
            var property = await _context.Properties.FindAsync(dto.PropertyId)
                ?? throw new ArgumentException("指定的物业不存在");
            await EnsureTaskTypeExistsAsync(dto.Type);

            var scheduledAt = string.IsNullOrEmpty(dto.ScheduledAt)
                ? (DateTimeOffset?)null
                : ParseDate(dto.ScheduledAt);

            var task = new InspectionTask
            {
                PropertyId = dto.PropertyId,
                ScheduledAt = scheduledAt,
                Type = (InspectionType)dto.Type,
                Notes = dto.Notes,
                IsBillable = dto.IsBillable
            };

            _context.InspectionTasks.Add(task);
            await _context.SaveChangesAsync();
            _logger.LogInformation("新增任务成功, ID: {Id}", task.Id);

            task.Property = property;
            FireAndForgetSync(task, "create");
            return ToDto(task, property.BillingPolicy.ToString());
        }

        public async Task<bool> UpdateTaskAsync(int id, InspectionTaskUpdateDto dto)
        {
            var existingTask = await _context.InspectionTasks.Include(t => t.Property).FirstOrDefaultAsync(t => t.Id == id);
            if (existingTask == null) return false;

            if (existingTask.Property == null || existingTask.Property.Id != dto.PropertyId)
            {
                var property = await _context.Properties.FindAsync(dto.PropertyId)
                    ?? throw new ArgumentException("指定的物业不存在");
                existingTask.Property = property;
            }
            await EnsureTaskTypeExistsAsync(dto.Type);

            var scheduledAt = string.IsNullOrEmpty(dto.ScheduledAt)
                ? (DateTimeOffset?)null
                : ParseDate(dto.ScheduledAt);

            existingTask.PropertyId = dto.PropertyId;
            existingTask.ScheduledAt = scheduledAt;
            existingTask.Notes = dto.Notes;
            existingTask.Type = (InspectionType)dto.Type;
            existingTask.IsBillable = dto.IsBillable;

            await _context.SaveChangesAsync();
            _logger.LogInformation("更新任务成功, ID: {Id}", id);
            FireAndForgetSync(existingTask, "update");
            return true;
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null) return false;

            _context.InspectionTasks.Remove(task);
            await _context.SaveChangesAsync();
            _logger.LogInformation("删除任务成功, ID: {Id}", id);
            FireAndForgetSync(task, "delete");
            return true;
        }

        public async Task CompleteTaskAsync(int id, TaskCompletionDto dto)
        {
            var task = await _context.InspectionTasks
                .FirstOrDefaultAsync(t => t.Id == id)
                ?? throw new ArgumentException($"未找到ID为{id}的任务");

            var executionDate = ParseDate(dto.ExecutionDate);

            _context.InspectionRecords.Add(new InspectionRecord
            {
                PropertyId = task.PropertyId,
                ExecutionDate = executionDate,
                Type = task.Type,
                IsCharged = task.IsBillable,
                ParkingFee = dto.ParkingFee
            });

            _context.InspectionTasks.Remove(task);

            await _context.SaveChangesAsync();
            _logger.LogInformation("完成任务成功, ID: {Id}", id);
        }
    }
}
