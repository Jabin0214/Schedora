namespace InspectionApi.Models.DTOs
{
    public class PayrollReportDto
    {
        public ReportPeriodDto Period { get; set; } = new();
        public ReportSummaryDto Summary { get; set; } = new();
        public List<InspectionRecordDto> Inspections { get; set; } = new();
        public List<SundryTaskDto> SundryTasks { get; set; } = new();
    }

    public class ReportPeriodDto
    {
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public int Days { get; set; }
    }

    public class ReportSummaryDto
    {
        public int TotalInspections { get; set; }
        public int TotalSundryTasks { get; set; }
    }

    public class InspectionRecordDto
    {
        public int Id { get; set; }
        public string ExecutionDate { get; set; } = string.Empty;
        public string? PropertyAddress { get; set; }
        public string Type { get; set; } = string.Empty;
        public bool IsCharged { get; set; }
        public string Notes { get; set; } = string.Empty;
    }

    public class TaskCompletionDto
    {
        public string ExecutionDate { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}