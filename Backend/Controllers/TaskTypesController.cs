using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskTypesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TaskTypesController> _logger;

        public TaskTypesController(AppDbContext context, ILogger<TaskTypesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/tasktypes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskType>>> GetTaskTypes()
        {
            return Ok(await _context.TaskTypes.OrderBy(t => t.DisplayOrder).ToListAsync());
        }

        // POST: api/tasktypes
        [HttpPost]
        public async Task<ActionResult<TaskType>> PostTaskType([FromBody] TaskTypeCreateDto dto)
        {
            var maxId = await _context.TaskTypes.MaxAsync(t => (int?)t.Id) ?? -1;
            var count = await _context.TaskTypes.CountAsync();

            var taskType = new TaskType
            {
                Id = maxId + 1,
                Name = dto.Name.Trim(),
                Color = dto.Color,
                DisplayOrder = count,
            };

            _context.TaskTypes.Add(taskType);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Task type created: {Name} (Id={Id})", taskType.Name, taskType.Id);
            return Ok(taskType);
        }

        // PUT: api/tasktypes/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTaskType(int id, [FromBody] TaskTypeUpdateDto dto)
        {
            var existing = await _context.TaskTypes.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = $"Task type {id} not found" });

            existing.Name = dto.Name.Trim();
            existing.Color = dto.Color;
            existing.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Task type updated: Id={Id}", id);
            return NoContent();
        }

        // DELETE: api/tasktypes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTaskType(int id)
        {
            var taskType = await _context.TaskTypes.FindAsync(id);
            if (taskType == null)
                return NotFound(new { message = $"Task type {id} not found" });

            var inUse = await _context.InspectionTasks.AnyAsync(t => (int)t.Type == id)
                     || await _context.InspectionRecords.AnyAsync(r => (int)r.Type == id);
            if (inUse)
                return BadRequest(new { message = $"Type \"{taskType.Name}\" is in use and cannot be deleted" });

            _context.TaskTypes.Remove(taskType);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Task type deleted: Id={Id}", id);
            return NoContent();
        }
    }
}
