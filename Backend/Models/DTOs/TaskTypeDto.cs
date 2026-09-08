using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models.DTOs
{
    public class TaskTypeCreateDto
    {
        [Required]
        [StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(30, MinimumLength = 1)]
        public string Color { get; set; } = "default";
    }

    public class TaskTypeUpdateDto
    {
        [Required]
        [StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(30, MinimumLength = 1)]
        public string Color { get; set; } = "default";

        [Range(0, int.MaxValue)]
        public int DisplayOrder { get; set; }
    }
}
