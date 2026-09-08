using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class InspectionTaskDto
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string? PropertyAddress { get; set; }
        public string? ScheduledAt { get; set; }
        public int Type { get; set; }
        public bool IsBillable { get; set; }
        public string? Notes { get; set; }
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class InspectionTaskCreateDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "PropertyId 必须为正整数")]
        public int PropertyId { get; set; }

        [StringLength(50)]
        public string? ScheduledAt { get; set; }

        [Range(0, 100)]
        public int Type { get; set; }

        public bool IsBillable { get; set; }

        public string? Notes { get; set; }
    }

    public class InspectionTaskUpdateDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "PropertyId 必须为正整数")]
        public int PropertyId { get; set; }

        [StringLength(50)]
        public string? ScheduledAt { get; set; }

        public string? Notes { get; set; }

        [Range(0, 100)]
        public int Type { get; set; }

        public bool IsBillable { get; set; }
    }
}
