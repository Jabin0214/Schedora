using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using System.Globalization;

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
            [FromQuery] DateTimeOffset? startDate,
            [FromQuery] DateTimeOffset? endDate,
            [FromQuery] string? address)
        {
            // 日期范围校验（按地址搜索时跳过）
            if (string.IsNullOrWhiteSpace(address) && startDate.HasValue && endDate.HasValue)
            {
                if (startDate.Value > endDate.Value)
                    return BadRequest(new { message = "开始日期不能晚于结束日期" });
                if ((endDate.Value - startDate.Value).TotalDays > 365)
                    return BadRequest(new { message = "查询范围不能超过365天" });
            }

            try
            {
                var query = _context.InspectionRecords
                    .Include(r => r.Property)
                    .AsQueryable();

                // 按地址搜索（忽略日期范围）
                if (!string.IsNullOrWhiteSpace(address))
                {
                    query = query.Where(r => r.Property != null && r.Property.Address.ToLower().Contains(address.ToLower()));
                }
                else
                {
                    // 日期范围过滤
                    if (startDate.HasValue)
                        query = query.Where(r => r.ExecutionDate >= startDate.Value);
                    if (endDate.HasValue)
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
                        Type = (int)r.Type,
                        r.IsCharged,
                        r.ParkingFee
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

        // PUT: api/inspectionrecords/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInspectionRecord(int id, [FromBody] InspectionRecordUpdateDto dto)
        {
            try
            {
                var record = await _context.InspectionRecords.FindAsync(id);
                if (record == null)
                    return NotFound(new { message = $"未找到ID为{id}的记录" });

                if (!DateTimeOffset.TryParse(dto.ExecutionDate, null, DateTimeStyles.RoundtripKind, out var parsedDate))
                    return BadRequest(new { message = "日期格式无效，请使用 ISO 8601 格式" });
                record.ExecutionDate = parsedDate;
                record.Type          = (InspectionType)dto.Type;
                record.IsCharged     = dto.IsCharged;
                record.ParkingFee    = dto.ParkingFee;

                await _context.SaveChangesAsync();
                _logger.LogInformation("更新记录成功, ID: {Id}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "更新记录失败, ID: {Id}", id);
                return StatusCode(500, new { message = "更新失败，请稍后重试" });
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

