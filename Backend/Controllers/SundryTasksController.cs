using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SundryTasksController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SundryTasksController> _logger;

        public SundryTasksController(AppDbContext context, ILogger<SundryTasksController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/sundrytasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SundryTask>>> GetSundryTasks()
        {
            try
            {
                var tasks = await _context.SundryTasks
                    .OrderByDescending(t => t.CreatedAt)
                    .ToListAsync();
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
                var task = await _context.SundryTasks.FindAsync(id);
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
        public async Task<ActionResult<SundryTask>> PostSundryTask([FromBody] SundryTask task)
        {
            try
            {
                _context.SundryTasks.Add(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("新增杂活成功, ID: {Id}, 描述: {Description}", task.Id, task.Description);
                return CreatedAtAction(nameof(GetSundryTask), new { id = task.Id }, task);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "新增杂活数据库操作失败");
                return StatusCode(500, new { message = "保存数据失败，请稍后重试" });
            }
        }

        // PUT: api/sundrytasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSundryTask(int id, [FromBody] SundryTask task)
        {
            if (id != task.Id)
            {
                return BadRequest(new { message = "ID不匹配" });
            }

            try
            {
                var existingTask = await _context.SundryTasks.FindAsync(id);
                if (existingTask == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的杂活" });
                }

                existingTask.Description = task.Description;
                existingTask.Cost = task.Cost;
                existingTask.Notes = task.Notes;
                existingTask.ExecutionDate = task.ExecutionDate;

                await _context.SaveChangesAsync();

                _logger.LogInformation("更新杂活成功, ID: {Id}", id);
                return NoContent();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "更新杂活并发冲突, ID: {Id}", id);
                return StatusCode(409, new { message = "数据已被其他用户修改，请刷新后重试" });
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
                var task = await _context.SundryTasks.FindAsync(id);
                if (task == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的杂活" });
                }

                _context.SundryTasks.Remove(task);
                await _context.SaveChangesAsync();

                _logger.LogInformation("删除杂活成功, ID: {Id}", id);
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

