using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
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
        public async Task<ActionResult<IEnumerable<PropertyDto>>> GetProperties()
        {
            var properties = await _context.Properties
                .Include(p => p.TenantContacts)
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            return Ok(properties.Select(p => new PropertyDto
                {
                    Id = p.Id,
                    Address = p.Address,
                    PropertyCondition = p.PropertyCondition,
                    BillingPolicy = p.BillingPolicy.ToString(),
                    TenantContactCount = p.TenantContacts.Count,
                    TenantContactSummary = TenantContactSummaryFormatter.FormatFirst(p.TenantContacts)
                }));
        }

        // GET: api/properties/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PropertyDto>> GetProperty(int id)
        {
            var property = await _context.Properties
                .Include(p => p.TenantContacts)
                .Where(p => p.Id == id)
                .FirstOrDefaultAsync();

            if (property == null)
                return NotFound(new { message = $"未找到ID为{id}的物业" });

            return Ok(new PropertyDto
            {
                Id = property.Id,
                Address = property.Address,
                PropertyCondition = property.PropertyCondition,
                BillingPolicy = property.BillingPolicy.ToString(),
                TenantContactCount = property.TenantContacts.Count,
                TenantContactSummary = TenantContactSummaryFormatter.FormatFirst(property.TenantContacts)
            });
        }

        // POST: api/properties
        [HttpPost]
        public async Task<ActionResult<Property>> PostProperty([FromBody] PropertyCreateDto dto)
        {
            if (!Enum.TryParse<BillingPolicy>(dto.BillingPolicy, out var billingPolicy))
                return BadRequest(new { message = $"无效的计费策略: {dto.BillingPolicy}" });

            var property = new Property
            {
                Address = dto.Address,
                PropertyCondition = dto.PropertyCondition,
                BillingPolicy = billingPolicy
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
            if (!Enum.TryParse<BillingPolicy>(dto.BillingPolicy, out var billingPolicy))
                return BadRequest(new { message = $"无效的计费策略: {dto.BillingPolicy}" });

            var existing = await _context.Properties.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = $"未找到ID为{id}的物业" });

            existing.Address = dto.Address;
            existing.PropertyCondition = dto.PropertyCondition;
            existing.BillingPolicy = billingPolicy;
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
                          || await _context.InspectionRecords.AnyAsync(r => r.PropertyId == id)
                          || await _context.TenantContacts.AnyAsync(c => c.PropertyId == id);
            if (hasRelated)
                return BadRequest(new { message = "该物业存在关联的任务、记录或租客联系人，无法删除" });

            _context.Properties.Remove(property);
            await _context.SaveChangesAsync();
            _logger.LogInformation("删除物业成功, ID: {Id}", id);
            return NoContent();
        }
    }
}
