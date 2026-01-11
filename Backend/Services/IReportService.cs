using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public interface IReportService
    {
        Task<PayrollReportDto> GetPayrollReportAsync(DateTime startDate, DateTime endDate);
        Task<PayrollReportDto> GetTwoWeeksReportAsync();
    }
}