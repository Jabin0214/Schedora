namespace InspectionApi.Models.DTOs
{
    public class InspectionTaskDto
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string? PropertyAddress { get; set; }
        public string? ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsBillable { get; set; }
        public string? Notes { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string? CompletedAt { get; set; }
        public string? LastInspectionDate { get; set; }
        public string? LastInspectionType { get; set; }
        public bool LastInspectionWasCharged { get; set; }
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class InspectionTaskCreateDto
    {
        public int PropertyId { get; set; }
        public string? ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class InspectionTaskUpdateDto
    {
        public int PropertyId { get; set; }
        public string? ScheduledAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}