using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        public const string AiInspectionReportPromptKey = "AiInspectionReportPrompt";
        private const int MaxPromptLength = 12000;

        private readonly AppDbContext _context;

        public SettingsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("ai-inspection-report-prompt")]
        public async Task<ActionResult<AiInspectionReportPromptDto>> GetAiInspectionReportPrompt()
        {
            var setting = await _context.SystemSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == AiInspectionReportPromptKey);

            return Ok(new AiInspectionReportPromptDto
            {
                Prompt = string.IsNullOrWhiteSpace(setting?.Value)
                    ? AiInspectionPromptBuilder.DefaultReportPrompt
                    : setting.Value,
            });
        }

        [HttpPut("ai-inspection-report-prompt")]
        public async Task<IActionResult> UpdateAiInspectionReportPrompt(
            [FromBody] AiInspectionReportPromptDto dto)
        {
            var prompt = (dto.Prompt ?? string.Empty).Trim();
            if (prompt.Length > MaxPromptLength)
                return BadRequest(new { message = $"Prompt must be {MaxPromptLength} characters or less." });

            var setting = await _context.SystemSettings.FindAsync(AiInspectionReportPromptKey);
            if (setting == null)
            {
                setting = new SystemSetting
                {
                    Key = AiInspectionReportPromptKey,
                    Value = prompt,
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.Value = prompt;
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
