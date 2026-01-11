namespace InspectionApi.Models.DTOs
{
    public class SundryTaskDto
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string? ExecutionDate { get; set; }
    }

    public class SundryTaskCreateDto
    {
        public string Description { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? ExecutionDate { get; set; }
    }

    public class SundryTaskUpdateDto
    {
        public string Description { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string? ExecutionDate { get; set; }
    }
}