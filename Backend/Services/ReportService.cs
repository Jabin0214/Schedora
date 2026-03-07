using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ReportService> _logger;

        public ReportService(AppDbContext context, ILogger<ReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<PayrollReportDto> GetPayrollReportAsync(DateTime startDate, DateTime endDate)
        {
            var inspectionRecords = await _context.InspectionRecords
                .Include(r => r.Property)
                .Where(r => r.ExecutionDate >= startDate && r.ExecutionDate <= endDate && r.IsCharged)
                .OrderBy(r => r.ExecutionDate)
                .Select(r => new InspectionRecordDto
                {
                    Id = r.Id,
                    ExecutionDate = r.ExecutionDate.ToString("O"),
                    PropertyAddress = r.Property != null ? r.Property.Address : null,
                    Type = r.Type.ToString(),
                    IsCharged = r.IsCharged
                })
                .ToListAsync();

            return new PayrollReportDto
            {
                Period = new ReportPeriodDto
                {
                    StartDate = startDate.ToString("O"),
                    EndDate = endDate.ToString("O"),
                    Days = (endDate - startDate).Days + 1
                },
                Summary = new ReportSummaryDto
                {
                    TotalInspections = inspectionRecords.Count
                },
                Inspections = inspectionRecords
            };
        }

        public async Task<PayrollReportDto> GetTwoWeeksReportAsync()
        {
            var endDate = DateTime.UtcNow.Date;
            var startDate = endDate.AddDays(-13);
            return await GetPayrollReportAsync(startDate, endDate);
        }
    }
}
