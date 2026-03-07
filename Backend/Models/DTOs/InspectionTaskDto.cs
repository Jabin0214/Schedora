namespace InspectionApi.Models.DTOs
{
    public class InspectionTaskDto
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string? PropertyAddress { get; set; }
        public string? ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public bool IsBillable { get; set; }
        public string? Notes { get; set; }
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class InspectionTaskCreateDto
    {
        public int PropertyId { get; set; }
        public string? ScheduledAt { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class InspectionTaskUpdateDto
    {
        public int PropertyId { get; set; }
        public string? ScheduledAt { get; set; }
        public string? Notes { get; set; }
        public string Type { get; set; } = string.Empty;
        public bool IsBillable { get; set; }
    }
}
