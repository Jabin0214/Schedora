using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InspectionApi.Controllers
{
    [Route("api/ai")]
    [ApiController]
    [Authorize]
    public class AiInspectionController : ControllerBase
    {
        private readonly IAiInspectionService _aiInspectionService;
        private readonly IAiTaskDraftService _aiTaskDraftService;
        private readonly ILogger<AiInspectionController> _logger;

        public AiInspectionController(
            IAiInspectionService aiInspectionService,
            IAiTaskDraftService aiTaskDraftService,
            ILogger<AiInspectionController> logger)
        {
            _aiInspectionService = aiInspectionService;
            _aiTaskDraftService = aiTaskDraftService;
            _logger = logger;
        }

        [HttpPost("inspection-polish")]
        public async Task<ActionResult<AiInspectionPolishResponseDto>> PolishInspectionNotes(
            [FromBody] AiInspectionPolishRequestDto request,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _aiInspectionService.PolishInspectionNotesAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "AI inspection polish unavailable");
                return StatusCode(503, new { message = "AI polish is unavailable. Check AI configuration or provider status." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI inspection polish failed");
                return StatusCode(500, new { message = "AI polish failed. Please try again later." });
            }
        }

        [HttpPost("task-draft")]
        public async Task<ActionResult<AiTaskDraftResponseDto>> CreateTaskDraft(
            [FromBody] AiTaskDraftRequestDto request,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _aiTaskDraftService.CreateDraftAsync(request, cancellationToken);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "AI task draft unavailable");
                return StatusCode(503, new { message = "AI task draft is unavailable. Check AI configuration or provider status." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI task draft failed");
                return StatusCode(500, new { message = "AI task draft failed. Please try again later." });
            }
        }
    }
}
