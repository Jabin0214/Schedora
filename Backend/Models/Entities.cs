using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models
{
    // 物业基础信息
    public class Property
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "地址不能为空")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "地址长度必须在5-200个字符之间")]
        public string Address { get; set; } = string.Empty;

        // 计费策略：六个月不收费 / 三个月交替收费
        public BillingPolicy BillingPolicy { get; set; } = BillingPolicy.ThreeMonthToggle;
        
        // 上次检查信息（用于判断是否收费）
        public DateTime? LastInspectionDate { get; set; } // 上次检查时间
        public InspectionType? LastInspectionType { get; set; } // 上次检查类型（MoveIn/MoveOut/Routine）
        public bool LastInspectionWasCharged { get; set; } // 上次检查是否收费
    }

    public enum InspectionType { MoveIn, MoveOut, Routine }

    // 状态精简：待预约、待执行、已完成
    public enum InspectionStatus
    {
        Pending,    // 待预约
        Ready,      // 待执行（已确定时间/待执行）
        Completed   // 已完成
    }

    // 物业计费策略
    public enum BillingPolicy
    {
        SixMonthFree,      // 六个月一次，不收费
        ThreeMonthToggle   // 三个月周期，收费/免费交替（上次收费则本次免费，反之收费）
    }

    // 检查任务 (计划中)
    public class InspectionTask
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; } // 导航属性
        
        public DateTime? ScheduledAt { get; set; } // 预约时间
        public InspectionType Type { get; set; }
        public InspectionStatus Status { get; set; }
        public bool IsBillable { get; set; } // 是否可计费（根据业务规则自动判断）
        
        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string? Notes { get; set; } // 预约备注
        
        public DateTime CreatedAt { get; set; } // 创建时间
        public DateTime? CompletedAt { get; set; } // 完成时间
        
        public InspectionTask()
        {
            CreatedAt = DateTime.UtcNow;
            Status = InspectionStatus.Pending;
        }
    }

    // 历史记录 (已完成)
    public class InspectionRecord
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; } // 导航属性
        public DateTime ExecutionDate { get; set; } // 执行日期
        public InspectionType Type { get; set; }
        public bool IsCharged { get; set; } // 是否收费
        
        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string Notes { get; set; } = string.Empty;
        
        public int? TaskId { get; set; } // 关联的任务ID（如果是从任务完成的）
    }

    // 杂活/工资
    public class SundryTask
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "描述不能为空")]
        [StringLength(200, ErrorMessage = "描述不能超过200个字符")]
        public string Description { get; set; } = string.Empty;
        
        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string? Notes { get; set; } // 详细说明
        
        public DateTime CreatedAt { get; set; }
        public DateTime? ExecutionDate { get; set; } // 执行日期（用于报表统计）
        
        public SundryTask()
        {
            CreatedAt = DateTime.UtcNow; // 在构造函数中赋值，使用UTC时间
        }
    }
}