using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkflowsController : ControllerBase
    {
        private readonly IWorkflowService _workflowService;

        public WorkflowsController(IWorkflowService workflowService)
        {
            _workflowService = workflowService;
        }

        [HttpGet("move-ins")]
        public async Task<ActionResult<IEnumerable<WorkflowDto>>> GetMoveIns(CancellationToken cancellationToken)
        {
            var workflows = await _workflowService.GetMoveInsAsync(cancellationToken);
            return Ok(workflows);
        }

        [HttpPost("move-ins")]
        public async Task<ActionResult<WorkflowDto>> CreateMoveIn([FromBody] WorkflowCreateDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var workflow = await _workflowService.CreateMoveInAsync(dto, cancellationToken);
                return Ok(workflow);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("move-ins/{id}")]
        public async Task<ActionResult<WorkflowDto>> UpdateMoveIn(int id, [FromBody] WorkflowUpdateDto dto, CancellationToken cancellationToken)
        {
            try
            {
                var workflow = await _workflowService.UpdateMoveInAsync(id, dto, cancellationToken);
                return workflow == null
                    ? NotFound(new { message = $"Move in workflow {id} was not found" })
                    : Ok(workflow);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("move-ins/{id}/items/{itemKey}")]
        public async Task<ActionResult<WorkflowDto>> UpdateChecklistItem(
            int id,
            string itemKey,
            [FromBody] WorkflowChecklistItemUpdateDto dto,
            CancellationToken cancellationToken)
        {
            try
            {
                var workflow = await _workflowService.UpdateChecklistItemAsync(id, itemKey, dto, cancellationToken);
                return Ok(workflow);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("move-ins/{id}/archive")]
        public async Task<IActionResult> ArchiveMoveIn(int id, CancellationToken cancellationToken)
        {
            var archived = await _workflowService.ArchiveAsync(id, cancellationToken);
            return archived ? NoContent() : NotFound(new { message = $"Move in workflow {id} was not found" });
        }
    }
}
