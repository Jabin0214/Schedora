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
        private readonly ILogger<AiInspectionController> _logger;

        public AiInspectionController(
            IAiInspectionService aiInspectionService,
            ILogger<AiInspectionController> logger)
        {
            _aiInspectionService = aiInspectionService;
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
    }
}
