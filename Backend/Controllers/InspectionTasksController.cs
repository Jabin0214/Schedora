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

        public InspectionTasksController(IInspectionTaskService taskService)
        {
            _taskService = taskService;
        }

        // GET: api/inspectiontasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InspectionTaskDto>>> GetInspectionTasks(CancellationToken cancellationToken)
        {
            var tasks = await _taskService.GetAllTasksAsync(cancellationToken);
            return Ok(tasks);
        }

        // POST: api/inspectiontasks
        [HttpPost]
        public async Task<ActionResult<InspectionTaskDto>> PostInspectionTask([FromBody] InspectionTaskCreateDto dto)
        {
            try
            {
                var result = await _taskService.CreateTaskAsync(dto);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/inspectiontasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutInspectionTask(int id, [FromBody] InspectionTaskUpdateDto dto)
        {
            try
            {
                var success = await _taskService.UpdateTaskAsync(id, dto);
                return success ? NoContent() : NotFound(new { message = $"未找到ID为{id}的任务" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE: api/inspectiontasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionTask(int id)
        {
            var success = await _taskService.DeleteTaskAsync(id);
            return success ? NoContent() : NotFound(new { message = $"未找到ID为{id}的任务" });
        }

        // POST: api/inspectiontasks/5/complete
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteTask(int id, [FromBody] TaskCompletionDto dto)
        {
            try
            {
                await _taskService.CompleteTaskAsync(id, dto);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
