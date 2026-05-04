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
                CleanlinessAreas  = await _context.CleanlinessAreas.OrderBy(a => a.DisplayOrder).ToListAsync(),
                DamageItems       = await _context.DamageItems.OrderBy(d => d.DisplayOrder).ToListAsync(),
                GeneralTemplates  = await _context.GeneralTemplates.AsNoTracking().ToListAsync(),
                AudienceTemplates = await _context.AudienceTemplates.AsNoTracking().ToListAsync(),
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

            // Auto-create the 4 GeneralTemplate + 2 AudienceTemplate rows in the same transaction.
            // Using the navigation property (InspectionType = type) lets EF resolve the generated
            // PK and order the inserts correctly within a single SaveChangesAsync call.
            for (int i = 0; i < 4; i++)
            {
                _context.GeneralTemplates.Add(new GeneralTemplate
                {
                    InspectionType = type,
                    HasCleanlinessIssue = (i & 1) != 0,
                    HasDamageIssue = (i & 2) != 0,
                    Text = string.Empty,
                });
            }
            foreach (TemplateAudience aud in new[] { TemplateAudience.Tenant, TemplateAudience.Landlord })
            {
                _context.AudienceTemplates.Add(new AudienceTemplate
                {
                    InspectionType = type,
                    Audience = aud,
                });
            }
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
            _context.TemplateInspectionTypes.Remove(type); // cascades to General/Audience
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── CleanlinessAreas ────────────────────────────────────

        [HttpPost("cleanliness-areas")]
        public async Task<ActionResult<CleanlinessArea>> CreateArea([FromBody] CleanlinessAreaCreateDto dto)
        {
            var count = await _context.CleanlinessAreas.CountAsync();
            var area = new CleanlinessArea
            {
                Name = dto.Name.Trim(),
                DirtyText = dto.DirtyText,
                DisplayOrder = count,
            };
            _context.CleanlinessAreas.Add(area);
            await _context.SaveChangesAsync();
            return Ok(area);
        }

        [HttpPut("cleanliness-areas/{id}")]
        public async Task<IActionResult> UpdateArea(int id, [FromBody] CleanlinessAreaUpdateDto dto)
        {
            var area = await _context.CleanlinessAreas.FindAsync(id);
            if (area == null) return NotFound();
            area.Name = dto.Name.Trim();
            area.DirtyText = dto.DirtyText;
            area.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("cleanliness-areas/{id}")]
        public async Task<IActionResult> DeleteArea(int id)
        {
            var area = await _context.CleanlinessAreas.FindAsync(id);
            if (area == null) return NotFound();
            _context.CleanlinessAreas.Remove(area);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── DamageItems ─────────────────────────────────────────

        [HttpPost("damage-items")]
        public async Task<ActionResult<DamageItem>> CreateDamage([FromBody] DamageItemCreateDto dto)
        {
            var count = await _context.DamageItems.CountAsync();
            var item = new DamageItem
            {
                Name = dto.Name.Trim(),
                Text = dto.Text,
                DisplayOrder = count,
            };
            _context.DamageItems.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("damage-items/{id}")]
        public async Task<IActionResult> UpdateDamage(int id, [FromBody] DamageItemUpdateDto dto)
        {
            var item = await _context.DamageItems.FindAsync(id);
            if (item == null) return NotFound();
            item.Name = dto.Name.Trim();
            item.Text = dto.Text;
            item.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("damage-items/{id}")]
        public async Task<IActionResult> DeleteDamage(int id)
        {
            var item = await _context.DamageItems.FindAsync(id);
            if (item == null) return NotFound();
            _context.DamageItems.Remove(item);
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

        // ─── AudienceTemplate text update ────────────────────────

        [HttpPut("audience/{id}")]
        public async Task<IActionResult> UpdateAudience(int id, [FromBody] AudienceTemplateUpdateDto dto)
        {
            var row = await _context.AudienceTemplates.FindAsync(id);
            if (row == null) return NotFound();
            row.NoIssueText = dto.NoIssueText;
            row.IssuePrefix = dto.IssuePrefix;
            row.IssueSuffix = dto.IssueSuffix;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
