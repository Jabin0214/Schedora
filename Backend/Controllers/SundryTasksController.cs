using Microsoft.AspNetCore.Mvc;
using InspectionApi.Services;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SundryTasksController : ControllerBase
    {
        private readonly ISundryTaskService _taskService;
        private readonly ILogger<SundryTasksController> _logger;

        public SundryTasksController(ISundryTaskService taskService, ILogger<SundryTasksController> logger)
        {
            _taskService = taskService;
            _logger = logger;
        }

        // GET: api/sundrytasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SundryTaskDto>>> GetSundryTasks()
        {
            try
            {
                var tasks = await _taskService.GetAllTasksAsync();
                return Ok(tasks);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取杂活列表失败");
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // GET: api/sundrytasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SundryTask>> GetSundryTask(int id)
        {
            try
            {
                var task = await _taskService.GetTaskByIdAsync(id);
                if (task == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的杂活" });
                }
                return Ok(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取杂活详情失败, ID: {Id}", id);
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // POST: api/sundrytasks
        [HttpPost]
        public async Task<ActionResult<SundryTaskDto>> PostSundryTask([FromBody] SundryTaskCreateDto dto)
        {
            try
            {
                var result = await _taskService.CreateTaskAsync(dto);
                return CreatedAtAction(nameof(GetSundryTask), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "新增杂活失败");
                return StatusCode(500, new { message = "操作失败，请稍后重试" });
            }
        }

        // PUT: api/sundrytasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSundryTask(int id, [FromBody] SundryTaskUpdateDto dto)
        {
            try
            {
                var success = await _taskService.UpdateTaskAsync(id, dto);
                if (!success)
                {
                    return NotFound(new { message = $"未找到ID为{id}的杂活" });
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新杂活失败, ID: {Id}", id);
                return StatusCode(500, new { message = "更新数据失败，请稍后重试" });
            }
        }

        // DELETE: api/sundrytasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSundryTask(int id)
        {
            try
            {
                var success = await _taskService.DeleteTaskAsync(id);
                if (!success)
                {
                    return NotFound(new { message = $"未找到ID为{id}的杂活" });
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "删除杂活失败, ID: {Id}", id);
                return StatusCode(500, new { message = "删除数据失败，请稍后重试" });
            }
        }
    }
}

