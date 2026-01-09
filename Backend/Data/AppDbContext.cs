using Microsoft.EntityFrameworkCore;
using InspectionApi.Models;

namespace InspectionApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Property> Properties { get; set; }
        public DbSet<InspectionTask> InspectionTasks { get; set; }
        public DbSet<InspectionRecord> InspectionRecords { get; set; }
        public DbSet<SundryTask> SundryTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 配置 Property 实体
            modelBuilder.Entity<Property>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Address).IsRequired().HasMaxLength(200);
                entity.HasIndex(p => p.Address); // 地址索引，方便查询
            });

            // 配置 InspectionTask 实体
            modelBuilder.Entity<InspectionTask>(entity =>
            {
                entity.HasKey(t => t.Id);
                
                // 配置外键关系
                entity.HasOne(t => t.Property)
                    .WithMany()
                    .HasForeignKey(t => t.PropertyId)
                    .OnDelete(DeleteBehavior.Restrict); // 防止误删物业时级联删除任务
                
                // 添加索引提升查询性能
                entity.HasIndex(t => t.PropertyId);
                entity.HasIndex(t => t.Status);
                entity.HasIndex(t => t.ScheduledAt);
                entity.HasIndex(t => t.CreatedAt);
            });

            // 配置 InspectionRecord 实体
            modelBuilder.Entity<InspectionRecord>(entity =>
            {
                entity.HasKey(r => r.Id);
                
                // 配置外键关系
                entity.HasOne(r => r.Property)
                    .WithMany()
                    .HasForeignKey(r => r.PropertyId)
                    .OnDelete(DeleteBehavior.Restrict);
                
                // 添加索引
                entity.HasIndex(r => r.PropertyId);
                entity.HasIndex(r => r.ExecutionDate);
                entity.HasIndex(r => r.TaskId);
            });

            // 配置 SundryTask 实体
            modelBuilder.Entity<SundryTask>(entity =>
            {
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Description).IsRequired().HasMaxLength(200);
                entity.HasIndex(s => s.ExecutionDate);
                entity.HasIndex(s => s.CreatedAt);
            });
        }
    }
}