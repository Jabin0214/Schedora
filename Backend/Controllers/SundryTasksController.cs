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

        public SundryTasksController(ISundryTaskService taskService)
        {
            _taskService = taskService;
        }

        // GET: api/sundrytasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SundryTaskDto>>> GetSundryTasks()
        {
            var tasks = await _taskService.GetAllTasksAsync();
            return Ok(tasks);
        }

        // POST: api/sundrytasks
        [HttpPost]
        public async Task<ActionResult<SundryTaskDto>> PostSundryTask([FromBody] SundryTaskCreateDto dto)
        {
            var result = await _taskService.CreateTaskAsync(dto);
            return Ok(result);
        }

        // PUT: api/sundrytasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSundryTask(int id, [FromBody] SundryTaskUpdateDto dto)
        {
            var success = await _taskService.UpdateTaskAsync(id, dto);
            return success ? NoContent() : NotFound(new { message = $"未找到ID为{id}的杂活" });
        }

        // DELETE: api/sundrytasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSundryTask(int id)
        {
            var success = await _taskService.DeleteTaskAsync(id);
            return success ? NoContent() : NotFound(new { message = $"未找到ID为{id}的杂活" });
        }
    }
}
