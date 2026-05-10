using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class AiInspectionPolishRequestDto
    {
        [StringLength(200)]
        public string? Address { get; set; }

        [StringLength(50)]
        public string? InspectionType { get; set; }

        [Required]
        [StringLength(1200, MinimumLength = 2)]
        public string Notes { get; set; } = string.Empty;

        public bool IsBillable { get; set; }
    }

    public class AiInspectionPolishResponseDto
    {
        public string GeneralText { get; set; } = string.Empty;
        public string TenantText { get; set; } = string.Empty;
        public string LandlordText { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
    }
}
