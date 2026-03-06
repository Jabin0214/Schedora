using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
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

        // GET: api/properties
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Property>>> GetProperties()
        {
            var properties = await _context.Properties.OrderByDescending(p => p.Id).ToListAsync();
            return Ok(properties);
        }

        // POST: api/properties
        [HttpPost]
        public async Task<ActionResult<Property>> PostProperty([FromBody] PropertyCreateDto dto)
        {
            var property = new Property
            {
                Address = dto.Address,
                BillingPolicy = Enum.Parse<BillingPolicy>(dto.BillingPolicy)
            };
            _context.Properties.Add(property);
            await _context.SaveChangesAsync();
            _logger.LogInformation("新增物业成功, ID: {Id}", property.Id);
            return Ok(property);
        }

        // PUT: api/properties/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProperty(int id, [FromBody] PropertyUpdateDto dto)
        {
            var existing = await _context.Properties.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = $"未找到ID为{id}的物业" });

            existing.Address = dto.Address;
            existing.BillingPolicy = Enum.Parse<BillingPolicy>(dto.BillingPolicy);
            await _context.SaveChangesAsync();
            _logger.LogInformation("更新物业成功, ID: {Id}", id);
            return NoContent();
        }

        // DELETE: api/properties/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProperty(int id)
        {
            var property = await _context.Properties.FindAsync(id);
            if (property == null)
                return NotFound(new { message = $"未找到ID为{id}的物业" });

            var hasRelated = await _context.InspectionTasks.AnyAsync(t => t.PropertyId == id)
                          || await _context.InspectionRecords.AnyAsync(r => r.PropertyId == id);
            if (hasRelated)
                return BadRequest(new { message = "该物业存在关联的任务或记录，无法删除" });

            _context.Properties.Remove(property);
            await _context.SaveChangesAsync();
            _logger.LogInformation("删除物业成功, ID: {Id}", id);
            return NoContent();
        }
    }
}
