using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class WorkflowDto
    {
        public int Id { get; set; }
        public int Type { get; set; }
        public string Address { get; set; } = string.Empty;
        public int Stage { get; set; }
        public string? MoveInAppointmentAt { get; set; }
        public string? Notes { get; set; }
        public bool IsArchived { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
        public List<WorkflowChecklistItemDto> Items { get; set; } = new();
    }

    public class WorkflowChecklistItemDto
    {
        public int Id { get; set; }
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int Stage { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsCompleted { get; set; }
        public string? CompletedAt { get; set; }
    }

    public class WorkflowCreateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Address { get; set; } = string.Empty;

        [StringLength(50)]
        public string? MoveInAppointmentAt { get; set; }

        public string? Notes { get; set; }
    }

    public class WorkflowUpdateDto
    {
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Address { get; set; } = string.Empty;

        [StringLength(50)]
        public string? MoveInAppointmentAt { get; set; }

        public string? Notes { get; set; }
    }

    public class WorkflowChecklistItemUpdateDto
    {
        public bool IsCompleted { get; set; }
    }
}
