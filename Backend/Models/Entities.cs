using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models
{
    public class Property
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "地址不能为空")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "地址长度必须在5-200个字符之间")]
        public string Address { get; set; } = string.Empty;

        public BillingPolicy BillingPolicy { get; set; } = BillingPolicy.ThreeMonthToggle;

        public ICollection<TenantContact> TenantContacts { get; set; } = new List<TenantContact>();
    }

    public class TenantContact
    {
        public int Id { get; set; }

        public int PropertyId { get; set; }
        public Property? Property { get; set; }

        [Required]
        [StringLength(200)]
        public string SourceAddress { get; set; } = string.Empty;

        [StringLength(80)]
        public string Phone { get; set; } = string.Empty;

        [StringLength(500)]
        public string Email { get; set; } = string.Empty;

        [StringLength(50)]
        public string LeaseDateEnded { get; set; } = string.Empty;

        public DateTimeOffset ImportedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public enum InspectionType { MoveIn, MoveOut, Routine, Other }

    // Dynamic task type config (user-manageable)
    public class TaskType
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        [StringLength(30)]
        public string Color { get; set; } = "default";

        public int DisplayOrder { get; set; }
    }

    public enum BillingPolicy
    {
        SixMonthFree,      // 六个月一次，不收费
        ThreeMonthToggle   // 三个月周期，收费/免费交替
    }

    public class InspectionTask
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; }

        public DateTimeOffset? ScheduledAt { get; set; }
        public InspectionType Type { get; set; }
        public bool IsBillable { get; set; }

        public string? Notes { get; set; }
    }

    public class InspectionRecord
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; }
        public DateTimeOffset ExecutionDate { get; set; }
        public InspectionType Type { get; set; }
        public bool IsCharged { get; set; }
        public decimal? ParkingFee { get; set; }
    }

    // ─── Quick-Templates feature ────────────────────────────────

    public class TemplateInspectionType
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
    }

    public class CleanlinessArea
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string DirtyText { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
    }

    public class DamageItem
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string Text { get; set; } = string.Empty;

        public int DisplayOrder { get; set; }
    }

    public class GeneralTemplate
    {
        public int Id { get; set; }

        public int InspectionTypeId { get; set; }
        public TemplateInspectionType? InspectionType { get; set; }

        public bool HasCleanlinessIssue { get; set; }
        public bool HasDamageIssue { get; set; }

        [StringLength(2000)]
        public string Text { get; set; } = string.Empty;
    }

    public enum TemplateAudience { Tenant = 0, Landlord = 1 }

    public class AudienceTemplate
    {
        public int Id { get; set; }

        public int InspectionTypeId { get; set; }
        public TemplateInspectionType? InspectionType { get; set; }

        public TemplateAudience Audience { get; set; }

        [StringLength(2000)]
        public string NoIssueText { get; set; } = string.Empty;

        [StringLength(1000)]
        public string IssuePrefix { get; set; } = string.Empty;

        [StringLength(1000)]
        public string IssueSuffix { get; set; } = string.Empty;
    }
}
