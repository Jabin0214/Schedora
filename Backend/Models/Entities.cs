using System.ComponentModel.DataAnnotations;

namespace InspectionApi.Models
{
    // 物业基础信息（仅保存地址）
    public class Property
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "地址不能为空")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "地址长度必须在5-200个字符之间")]
        public string Address { get; set; } = string.Empty;
    }

    public enum InspectionType { MoveIn, MoveOut, Routine }
    public enum InspectionStatus { Pending, Scheduled, Completed }

    // 检查任务 (计划中)
    public class InspectionTask
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public Property? Property { get; set; } // 导航属性
        public DateTime? ScheduledAt { get; set; }
        public InspectionType Type { get; set; }
        public InspectionStatus Status { get; set; }
        public bool IsBillable { get; set; } 
        
        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string? Notes { get; set; }
    }

    // 历史记录 (已完成)
    public class InspectionRecord
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public DateTime ExecutionDate { get; set; }
        public InspectionType Type { get; set; }
        public bool IsCharged { get; set; }
        
        [StringLength(500, ErrorMessage = "备注不能超过500个字符")]
        public string Notes { get; set; } = string.Empty;
    }

    // 杂活/工资
    public class SundryTask
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "描述不能为空")]
        [StringLength(200, ErrorMessage = "描述不能超过200个字符")]
        public string Description { get; set; } = string.Empty;
        
        [Range(0, 999999.99, ErrorMessage = "费用必须在0-999999.99之间")]
        public decimal Cost { get; set; } // 比如买东西花了多少钱
        
        public DateTime CreatedAt { get; set; }
        
        public SundryTask()
        {
            CreatedAt = DateTime.UtcNow; // 在构造函数中赋值，使用UTC时间
        }
    }
}