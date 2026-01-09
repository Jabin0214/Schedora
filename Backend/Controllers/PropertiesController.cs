using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")] // 访问地址是 /api/properties
    [ApiController]
    public class PropertiesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PropertiesController> _logger;

        public PropertiesController(AppDbContext context, ILogger<PropertiesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/properties (获取所有)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Property>>> GetProperties()
        {
            try
            {
                var properties = await _context.Properties
                    .OrderByDescending(p => p.Id)
                    .ToListAsync();
                return Ok(properties);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取物业列表失败");
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // GET: api/properties/5 (获取单个)
        [HttpGet("{id}")]
        public async Task<ActionResult<Property>> GetProperty(int id)
        {
            try
            {
                var property = await _context.Properties.FindAsync(id);
                if (property == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的物业" });
                }
                return Ok(property);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取物业详情失败, ID: {Id}", id);
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // POST: api/properties (添加一个)
        [HttpPost]
        public async Task<ActionResult<Property>> PostProperty([FromBody] Property property)
        {
            try
            {
                // ModelState验证由[ApiController]自动处理
                _context.Properties.Add(property);
                await _context.SaveChangesAsync();

                _logger.LogInformation("新增物业成功, ID: {Id}, 地址: {Address}", property.Id, property.Address);
                return CreatedAtAction(nameof(GetProperty), new { id = property.Id }, property);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "新增物业数据库操作失败");
                return StatusCode(500, new { message = "保存数据失败，请稍后重试" });
            }
        }

        // PUT: api/properties/5 (更新一个)
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProperty(int id, [FromBody] Property property)
        {
            if (id != property.Id)
            {
                return BadRequest(new { message = "ID不匹配" });
            }

            try
            {
                var existingProperty = await _context.Properties.FindAsync(id);
                if (existingProperty == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的物业" });
                }

                // 更新字段
                existingProperty.Address = property.Address;
                existingProperty.BillingPolicy = property.BillingPolicy;

                await _context.SaveChangesAsync();

                _logger.LogInformation("更新物业成功, ID: {Id}", id);
                return NoContent();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "更新物业并发冲突, ID: {Id}", id);
                return StatusCode(409, new { message = "数据已被其他用户修改，请刷新后重试" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新物业失败, ID: {Id}", id);
                return StatusCode(500, new { message = "更新数据失败，请稍后重试" });
            }
        }

        // DELETE: api/properties/5 (删除一个)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProperty(int id)
        {
            try
            {
                var property = await _context.Properties.FindAsync(id);
                if (property == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的物业" });
                }

                // 检查是否有关联的任务或记录
                var hasRelatedTasks = await _context.InspectionTasks.AnyAsync(t => t.PropertyId == id);
                var hasRelatedRecords = await _context.InspectionRecords.AnyAsync(r => r.PropertyId == id);

                if (hasRelatedTasks || hasRelatedRecords)
                {
                    return BadRequest(new { message = "该物业存在关联的任务或记录，无法删除" });
                }

                _context.Properties.Remove(property);
                await _context.SaveChangesAsync();

                _logger.LogInformation("删除物业成功, ID: {Id}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "删除物业失败, ID: {Id}", id);
                return StatusCode(500, new { message = "删除数据失败，请稍后重试" });
            }
        }
    }
}