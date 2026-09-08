using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class AiTaskDraftRequestDto
    {
        [Required]
        [StringLength(800, MinimumLength = 2)]
        public string Text { get; set; } = string.Empty;
    }

    public class AiTaskDraftExtractedFields
    {
        public string AddressQuery { get; set; } = string.Empty;
        public string? ScheduledAtIso { get; set; }
        public string? TypeName { get; set; }
        public bool? IsBillable { get; set; }
        public string? Notes { get; set; }
    }

    public class AiTaskDraftPropertyCandidateDto
    {
        public int PropertyId { get; set; }
        public string Address { get; set; } = string.Empty;
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class AiTaskDraftResponseDto
    {
        public string Status { get; set; } = "needsConfirmation";
        public int? PropertyId { get; set; }
        public string? PropertyAddress { get; set; }
        public string? ScheduledAt { get; set; }
        public int Type { get; set; }
        public bool IsBillable { get; set; }
        public string? Notes { get; set; }
        public string AddressQuery { get; set; } = string.Empty;
        public IReadOnlyList<AiTaskDraftPropertyCandidateDto> PropertyCandidates { get; set; } =
            Array.Empty<AiTaskDraftPropertyCandidateDto>();
    }
}
