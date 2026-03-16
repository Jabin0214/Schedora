namespace InspectionApi.Models.DTOs
{
    public class PayrollReportDto
    {
        public ReportPeriodDto Period { get; set; } = new();
        public ReportSummaryDto Summary { get; set; } = new();
        public List<InspectionRecordDto> Inspections { get; set; } = new();
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
    }

    public class InspectionRecordDto
    {
        public int Id { get; set; }
        public string ExecutionDate { get; set; } = string.Empty;
        public string? PropertyAddress { get; set; }
        public int Type { get; set; }
        public bool IsCharged { get; set; }
        public decimal? ParkingFee { get; set; }
    }

    public class TaskCompletionDto
    {
        public string ExecutionDate { get; set; } = string.Empty;
        public decimal? ParkingFee { get; set; }
    }

    public class InspectionRecordUpdateDto
    {
        public string ExecutionDate { get; set; } = string.Empty;
        public int Type { get; set; }
        public bool IsCharged { get; set; }
        public decimal? ParkingFee { get; set; }
    }
}
