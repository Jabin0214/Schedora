using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class PropertyDto
    {
        public int Id { get; set; }
        public string Address { get; set; } = string.Empty;
        public string BillingPolicy { get; set; } = string.Empty;
        public string? LastInspectionDate { get; set; }
        public string? LastInspectionType { get; set; }
        public bool LastInspectionWasCharged { get; set; }
        public int TenantContactCount { get; set; }
        public string? TenantContactSummary { get; set; }
    }

    public class PropertyCreateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class PropertyUpdateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 2)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string BillingPolicy { get; set; } = string.Empty;
    }
}
