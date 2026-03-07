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
    }

    public enum InspectionType { MoveIn, MoveOut, Routine }

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

        public DateTime? ScheduledAt { get; set; }
        public InspectionType Type { get; set; }
        public bool IsBillable { get; set; }

        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string? Notes { get; set; }
    }

    public class InspectionRecord
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; }
        public DateTime ExecutionDate { get; set; }
        public InspectionType Type { get; set; }
        public bool IsCharged { get; set; }
    }
}
