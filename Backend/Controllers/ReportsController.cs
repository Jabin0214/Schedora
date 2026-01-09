using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(AppDbContext context, ILogger<ReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/reports/payroll?startDate=2024-01-01&endDate=2024-01-14
        [HttpGet("payroll")]
        public async Task<ActionResult<object>> GetPayrollReport(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                // 获取指定日期范围内的检查记录（收费的）
                var inspectionRecords = await _context.InspectionRecords
                    .Include(r => r.Property)
                    .Where(r => r.ExecutionDate >= startDate && r.ExecutionDate <= endDate && r.IsCharged)
                    .OrderBy(r => r.ExecutionDate)
                    .Select(r => new
                    {
                        r.Id,
                        r.ExecutionDate,
                        PropertyAddress = r.Property != null ? r.Property.Address : null,
                        r.Type,
                        r.IsCharged,
                        r.Notes
                    })
                    .ToListAsync();

                // 获取指定日期范围内的杂活记录
                var sundryTasks = await _context.SundryTasks
                    .Where(s => s.ExecutionDate.HasValue && 
                                s.ExecutionDate.Value >= startDate && 
                                s.ExecutionDate.Value <= endDate)
                    .OrderBy(s => s.ExecutionDate)
                    .Select(s => new
                    {
                        s.Id,
                        s.Description,
                        s.Cost,
                        s.Notes,
                        ExecutionDate = s.ExecutionDate!.Value
                    })
                    .ToListAsync();

                // 统计信息
                var totalInspections = inspectionRecords.Count;
                var totalSundryTasks = sundryTasks.Count;
                var totalSundryCost = sundryTasks.Sum(s => s.Cost);

                var report = new
                {
                    Period = new
                    {
                        StartDate = startDate,
                        EndDate = endDate,
                        Days = (endDate - startDate).Days + 1
                    },
                    Summary = new
                    {
                        TotalInspections = totalInspections,
                        TotalSundryTasks = totalSundryTasks,
                        TotalSundryCost = totalSundryCost
                    },
                    Inspections = inspectionRecords,
                    SundryTasks = sundryTasks
                };

                return Ok(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "生成工资报表失败");
                return StatusCode(500, new { message = "生成报表失败，请稍后重试" });
            }
        }

        // GET: api/reports/two-weeks - 获取最近两周的报表
        [HttpGet("two-weeks")]
        public async Task<ActionResult<object>> GetTwoWeeksReport()
        {
            var endDate = DateTime.UtcNow.Date;
            var startDate = endDate.AddDays(-13); // 14天前（包含今天共14天）

            return await GetPayrollReport(startDate, endDate);
        }
    }
}

