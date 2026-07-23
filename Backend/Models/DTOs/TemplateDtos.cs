using System.ComponentModel.DataAnnotations;
using InspectionApi.Models;

namespace InspectionApi.Models.DTOs
{
    // ─── Aggregate response ──────────────────────────────────────
    public class TemplatesAllDto
    {
        public List<TemplateInspectionType> InspectionTypes { get; set; } = new();
        public List<GeneralTemplate> GeneralTemplates { get; set; } = new();
    }

    // ─── InspectionType ──────────────────────────────────────────
    public class TemplateInspectionTypeCreateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;
    }

    public class TemplateInspectionTypeUpdateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }

    // ─── Text-only updates ───────────────────────────────────────
    public class GeneralTemplateUpdateDto
    {
        [StringLength(2000)]
        public string Text { get; set; } = string.Empty;
    }
}
