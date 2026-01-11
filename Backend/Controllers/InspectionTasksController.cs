using Microsoft.AspNetCore.Mvc;
using InspectionApi.Services;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionTasksController : ControllerBase
    {
        private readonly IInspectionTaskService _taskService;
        private readonly ILogger<InspectionTasksController> _logger;

        public InspectionTasksController(IInspectionTaskService taskService, ILogger<InspectionTasksController> logger)
        {
            _taskService = taskService;
            _logger = logger;
        }

        // GET: api/inspectiontasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InspectionTaskDto>>> GetInspectionTasks(CancellationToken cancellationToken = default)
        {
            try
            {
                var tasks = await _taskService.GetAllTasksAsync(cancellationToken);
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
                var task = await _taskService.GetTaskByIdAsync(id);

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
        public async Task<ActionResult<InspectionTaskDto>> PostInspectionTask([FromBody] InspectionTaskCreateDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(e => $"{x.Key}: {e.ErrorMessage}"));
                    return BadRequest(new { message = "验证失败", errors });
                }

                var result = await _taskService.CreateTaskAsync(dto);
                return CreatedAtAction(nameof(GetInspectionTask), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "新增任务失败");
                return StatusCode(500, new { message = "操作失败，请稍后重试" });
            }
        }

        // PUT: api/inspectiontasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutInspectionTask(int id, [FromBody] InspectionTaskUpdateDto dto)
        {
            try
            {
                var success = await _taskService.UpdateTaskAsync(id, dto);
                if (!success)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }

                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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
                var success = await _taskService.DeleteTaskAsync(id);
                if (!success)
                {
                    return NotFound(new { message = $"未找到ID为{id}的任务" });
                }

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
        public async Task<ActionResult<InspectionRecord>> CompleteTask(int id, [FromBody] TaskCompletionDto dto)
        {
            try
            {
                var record = await _taskService.CompleteTaskAsync(id, dto);
                return Ok(record);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "完成任务失败, ID: {Id}", id);
                return StatusCode(500, new { message = "完成任务失败，请稍后重试" });
            }
        }
    }
}

