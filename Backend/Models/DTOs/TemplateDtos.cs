using System.ComponentModel.DataAnnotations;
using InspectionApi.Models;

namespace InspectionApi.Models.DTOs
{
    // ─── Aggregate response ──────────────────────────────────────
    public class TemplatesAllDto
    {
        public List<TemplateInspectionType> InspectionTypes { get; set; } = new();
        public List<CleanlinessArea> CleanlinessAreas { get; set; } = new();
        public List<DamageItem> DamageItems { get; set; } = new();
        public List<GeneralTemplate> GeneralTemplates { get; set; } = new();
        public List<AudienceTemplate> AudienceTemplates { get; set; } = new();
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

    // ─── CleanlinessArea ─────────────────────────────────────────
    public class CleanlinessAreaCreateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string DirtyText { get; set; } = string.Empty;
    }

    public class CleanlinessAreaUpdateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string DirtyText { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
    }

    // ─── DamageItem ──────────────────────────────────────────────
    public class DamageItemCreateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Text { get; set; } = string.Empty;
    }

    public class DamageItemUpdateDto
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Text { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
    }

    // ─── Text-only updates ───────────────────────────────────────
    public class GeneralTemplateUpdateDto
    {
        [StringLength(2000)]
        public string Text { get; set; } = string.Empty;
    }

    public class AudienceTemplateUpdateDto
    {
        [StringLength(2000)]
        public string NoIssueText { get; set; } = string.Empty;

        [StringLength(1000)]
        public string IssuePrefix { get; set; } = string.Empty;

        [StringLength(1000)]
        public string IssueSuffix { get; set; } = string.Empty;
    }
}
