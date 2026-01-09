using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionTasksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<InspectionTasksController> _logger;

        public InspectionTasksController(AppDbContext context, ILogger<InspectionTasksController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // 判断是否应该收费（三个月间隔规则）
        private bool ShouldCharge(Property property, InspectionType type)
        {
            // MoveIn 和 MoveOut 总是收费
            if (type == InspectionType.MoveIn || type == InspectionType.MoveOut)
                return true;

            // Routine 检查：如果上次收费了，这次免费；如果上次免费或超过3个月，这次收费
            if (type == InspectionType.Routine)
            {
                if (!property.LastInspectionDate.HasValue)
                    return true; // 首次检查收费

                var monthsSinceLastInspection = (DateTime.UtcNow - property.LastInspectionDate.Value).TotalDays / 30;

                // 如果上次收费了，这次免费（间隔收费）
                if (property.LastInspectionWasCharged)
                    return false;

                // 如果超过3个月，收费
                return monthsSinceLastInspection >= 3;
            }

            return true;
        }

        // GET: api/inspectiontasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetInspectionTasks()
        {
            try
            {
                var tasks = await _context.InspectionTasks
                    .Include(t => t.Property)
                    .OrderByDescending(t => t.ScheduledAt ?? DateTime.MaxValue)
                    .Select(t => new
                    {
                        t.Id,
                        t.PropertyId,
                        PropertyAddress = t.Property != null ? t.Property.Address : null,
                        t.ContactPhone,
                        t.ContactEmail,
                        t.ScheduledAt,
                        t.Type,
                        t.Status,
                        t.IsBillable,
                        t.Notes,
                        t.CreatedAt,
                        t.CompletedAt,
                        // 物业的上次检查信息
                        LastInspectionDate = t.Property != null ? t.Property.LastInspectionDate : null,
                        LastInspectionType = t.Property != null ? t.Property.LastInspectionType : null,
                        LastInspectionWasCharged = t.Property != null ? t.Property.LastInspectionWasCharged : false
                    })
                    .ToListAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取任务列表失败");
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // GET: api/inspectiontasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<InspectionTask>> GetInspectionTask(int id)
        {
            try
            {
                var task = await _context.InspectionTasks
                    .Include(t => t.Property)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (task == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }
                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取任务详情失败, ID: {Id}", id);
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // POST: api/inspectiontasks
        [HttpPost]
        public async Task<ActionResult<InspectionTask>> PostInspectionTask([FromBody] InspectionTask task)
        {
            try
            {
                // 模型验证
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(e => $"{x.Key}: {e.ErrorMessage}"));
                    return BadRequest(new { message = "验证失败", errors });
                }

                if (task == null)
                {
                    return BadRequest(new { message = "任务数据不能为空" });
                }

                // 验证物业是否存在并获取物业信息
                var property = await _context.Properties.FindAsync(task.PropertyId);
                if (property == null)
                {
                    return BadRequest(new { message = "指定的物业不存在" });
                }

                // 确保状态有默认值（如果未设置）
                if (task.Status == default)
                {
                    task.Status = InspectionStatus.Pending;
                }

                // 自动判断是否收费
                task.IsBillable = ShouldCharge(property, task.Type);

                // 如果设置了预约时间，状态改为已预约
                if (task.ScheduledAt.HasValue && task.Status == InspectionStatus.Pending)
                {
                    task.Status = InspectionStatus.Scheduled;
                }

                // 确保创建时间已设置
                if (task.CreatedAt == default)
                {
                    task.CreatedAt = DateTime.UtcNow;
                }

                _context.InspectionTasks.Add(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("新增任务成功, ID: {Id}, 类型: {Type}, 是否收费: {IsBillable}",
                    task.Id, task.Type, task.IsBillable);
                return CreatedAtAction(nameof(GetInspectionTask), new { id = task.Id }, task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "新增任务失败: {Message}", ex.Message);
                if (ex is DbUpdateException)
                {
                    return StatusCode(500, new { message = "保存数据失败，请稍后重试" });
                }
                return StatusCode(500, new { message = $"操作失败: {ex.Message}" });
            }
        }

        // PUT: api/inspectiontasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutInspectionTask(int id, [FromBody] InspectionTask task)
        {
            if (id != task.Id)
            {
                return BadRequest(new { message = "ID不匹配" });
            }

            try
            {
                var existingTask = await _context.InspectionTasks.FindAsync(id);
                if (existingTask == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }

                // 验证物业是否存在
                var propertyExists = await _context.Properties.AnyAsync(p => p.Id == task.PropertyId);
                if (!propertyExists)
                {
                    return BadRequest(new { message = "指定的物业不存在" });
                }

                // 获取物业信息用于判断是否收费
                var property = await _context.Properties.FindAsync(task.PropertyId);
                if (property == null)
                {
                    return BadRequest(new { message = "指定的物业不存在" });
                }

                // 更新字段
                existingTask.PropertyId = task.PropertyId;
                existingTask.ContactPhone = task.ContactPhone;
                existingTask.ContactEmail = task.ContactEmail;
                existingTask.ScheduledAt = task.ScheduledAt;
                existingTask.Type = task.Type;
                existingTask.Status = task.Status;
                existingTask.Notes = task.Notes;

                // 重新计算是否收费（如果类型改变）
                if (existingTask.Type != task.Type)
                {
                    existingTask.IsBillable = ShouldCharge(property, task.Type);
                }

                // 如果设置了预约时间，状态改为已预约
                if (task.ScheduledAt.HasValue && existingTask.Status == InspectionStatus.Pending)
                {
                    existingTask.Status = InspectionStatus.Scheduled;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("更新任务成功, ID: {Id}", id);
                return NoContent();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "更新任务并发冲突, ID: {Id}", id);
                return StatusCode(409, new { message = "数据已被其他用户修改，请刷新后重试" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新任务失败, ID: {Id}", id);
                return StatusCode(500, new { message = "更新数据失败，请稍后重试" });
            }
        }

        // DELETE: api/inspectiontasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionTask(int id)
        {
            try
            {
                var task = await _context.InspectionTasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }

                _context.InspectionTasks.Remove(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("删除任务成功, ID: {Id}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "删除任务失败, ID: {Id}", id);
                return StatusCode(500, new { message = "删除数据失败，请稍后重试" });
            }
        }

        // POST: api/inspectiontasks/5/complete - 完成任务
        [HttpPost("{id}/complete")]
        public async Task<ActionResult<InspectionRecord>> CompleteTask(int id, [FromBody] InspectionRecord record)
        {
            try
            {
                var task = await _context.InspectionTasks
                    .Include(t => t.Property)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (task == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }

                if (task.Status == InspectionStatus.Completed)
                {
                    return BadRequest(new { message = "任务已完成，不能重复完成" });
                }

                // 创建完成记录
                var inspectionRecord = new InspectionRecord
                {
                    PropertyId = task.PropertyId,
                    ExecutionDate = record.ExecutionDate,
                    Type = task.Type,
                    IsCharged = task.IsBillable,
                    Notes = record.Notes ?? string.Empty,
                    TaskId = task.Id
                };

                _context.InspectionRecords.Add(inspectionRecord);

                // 更新任务状态
                task.Status = InspectionStatus.Completed;
                task.CompletedAt = DateTime.UtcNow;

                // 更新物业的上次检查信息
                if (task.Property != null)
                {
                    task.Property.LastInspectionDate = record.ExecutionDate;
                    task.Property.LastInspectionType = task.Type;
                    task.Property.LastInspectionWasCharged = task.IsBillable;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("完成任务成功, 任务ID: {TaskId}, 记录ID: {RecordId}", id, inspectionRecord.Id);
                return Ok(inspectionRecord);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "完成任务失败, ID: {Id}", id);
                return StatusCode(500, new { message = "完成任务失败，请稍后重试" });
            }
        }
    }
}

