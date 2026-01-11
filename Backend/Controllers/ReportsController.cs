using Microsoft.AspNetCore.Mvc;
using InspectionApi.Services;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(IReportService reportService, ILogger<ReportsController> logger)
        {
            _reportService = reportService;
            _logger = logger;
        }

        // GET: api/reports/payroll?startDate=2024-01-01&endDate=2024-01-14
        [HttpGet("payroll")]
        public async Task<ActionResult<PayrollReportDto>> GetPayrollReport(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                var report = await _reportService.GetPayrollReportAsync(startDate, endDate);
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
        public async Task<ActionResult<PayrollReportDto>> GetTwoWeeksReport()
        {
            try
            {
                var report = await _reportService.GetTwoWeeksReportAsync();
                return Ok(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "生成两周报表失败");
                return StatusCode(500, new { message = "生成报表失败，请稍后重试" });
            }
        }
    }
}

