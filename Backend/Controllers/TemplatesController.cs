using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TemplatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TemplatesController> _logger;

        public TemplatesController(AppDbContext context, ILogger<TemplatesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/templates/all
        [HttpGet("all")]
        public async Task<ActionResult<TemplatesAllDto>> GetAll()
        {
            var dto = new TemplatesAllDto
            {
                InspectionTypes   = await _context.TemplateInspectionTypes.OrderBy(t => t.DisplayOrder).ToListAsync(),
                GeneralTemplates  = await _context.GeneralTemplates.AsNoTracking().ToListAsync(),
            };
            return Ok(dto);
        }

        // ─── InspectionTypes ─────────────────────────────────────

        [HttpPost("inspection-types")]
        public async Task<ActionResult<TemplateInspectionType>> CreateInspectionType(
            [FromBody] TemplateInspectionTypeCreateDto dto)
        {
            var count = await _context.TemplateInspectionTypes.CountAsync();
            var type = new TemplateInspectionType
            {
                Name = dto.Name.Trim(),
                DisplayOrder = count,
            };
            _context.TemplateInspectionTypes.Add(type);

            // Auto-create the GeneralTemplate row in the same transaction.
            // Using the navigation property (InspectionType = type) lets EF resolve the generated
            // PK and order the inserts correctly within a single SaveChangesAsync call.
            _context.GeneralTemplates.Add(new GeneralTemplate
            {
                InspectionType = type,
                Text = string.Empty,
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation("Inspection type created: {Name} (Id={Id})", type.Name, type.Id);
            return Ok(type);
        }

        [HttpPut("inspection-types/{id}")]
        public async Task<IActionResult> UpdateInspectionType(int id, [FromBody] TemplateInspectionTypeUpdateDto dto)
        {
            var type = await _context.TemplateInspectionTypes.FindAsync(id);
            if (type == null) return NotFound();
            type.Name = dto.Name.Trim();
            type.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("inspection-types/{id}")]
        public async Task<IActionResult> DeleteInspectionType(int id)
        {
            var type = await _context.TemplateInspectionTypes.FindAsync(id);
            if (type == null) return NotFound();
            _context.TemplateInspectionTypes.Remove(type); // cascades to GeneralTemplate
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── GeneralTemplate text update ─────────────────────────

        [HttpPut("general/{id}")]
        public async Task<IActionResult> UpdateGeneral(int id, [FromBody] GeneralTemplateUpdateDto dto)
        {
            var row = await _context.GeneralTemplates.FindAsync(id);
            if (row == null) return NotFound();
            row.Text = dto.Text;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
