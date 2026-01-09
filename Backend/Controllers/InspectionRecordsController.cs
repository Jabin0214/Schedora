using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionRecordsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<InspectionRecordsController> _logger;

        public InspectionRecordsController(AppDbContext context, ILogger<InspectionRecordsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/inspectionrecords
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetInspectionRecords(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var query = _context.InspectionRecords
                    .Include(r => r.Property)
                    .AsQueryable();

                // 日期范围过滤
                if (startDate.HasValue)
                {
                    query = query.Where(r => r.ExecutionDate >= startDate.Value);
                }
                if (endDate.HasValue)
                {
                    query = query.Where(r => r.ExecutionDate <= endDate.Value);
                }

                var records = await query
                    .OrderByDescending(r => r.ExecutionDate)
                    .Select(r => new
                    {
                        r.Id,
                        r.PropertyId,
                        PropertyAddress = r.Property != null ? r.Property.Address : null,
                        r.ExecutionDate,
                        r.Type,
                        r.IsCharged,
                        r.Notes,
                        r.TaskId
                    })
                    .ToListAsync();

                return Ok(records);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取检查记录失败");
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }

        // GET: api/inspectionrecords/5
        [HttpGet("{id}")]
        public async Task<ActionResult<InspectionRecord>> GetInspectionRecord(int id)
        {
            try
            {
                var record = await _context.InspectionRecords
                    .Include(r => r.Property)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (record == null)
                {
                    return NotFound(new { message = $"未找到ID为{id}的记录" });
                }
                return Ok(record);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "获取检查记录详情失败, ID: {Id}", id);
                return StatusCode(500, new { message = "获取数据失败，请稍后重试" });
            }
        }
    }
}

