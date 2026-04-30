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
        public DbSet<TaskType> TaskTypes { get; set; }
        public DbSet<TemplateInspectionType> TemplateInspectionTypes { get; set; }
        public DbSet<CleanlinessArea> CleanlinessAreas { get; set; }
        public DbSet<DamageItem> DamageItems { get; set; }
        public DbSet<GeneralTemplate> GeneralTemplates { get; set; }
        public DbSet<AudienceTemplate> AudienceTemplates { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Property>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Address).IsRequired().HasMaxLength(200);
                entity.HasIndex(p => p.Address);
            });

            modelBuilder.Entity<InspectionTask>(entity =>
            {
                entity.HasKey(t => t.Id);
                entity.HasOne(t => t.Property)
                    .WithMany()
                    .HasForeignKey(t => t.PropertyId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(t => t.PropertyId);
                entity.HasIndex(t => t.ScheduledAt);
            });

            modelBuilder.Entity<TaskType>(entity =>
            {
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Id).ValueGeneratedNever();
                entity.Property(t => t.Name).IsRequired().HasMaxLength(50);
                entity.Property(t => t.Color).HasMaxLength(30);
                entity.HasIndex(t => t.DisplayOrder);
            });

            modelBuilder.Entity<InspectionRecord>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.HasOne(r => r.Property)
                    .WithMany()
                    .HasForeignKey(r => r.PropertyId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(r => r.PropertyId);
                entity.HasIndex(r => r.ExecutionDate);
            });

            modelBuilder.Entity<TemplateInspectionType>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.DisplayOrder);
            });

            modelBuilder.Entity<CleanlinessArea>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DirtyText).HasMaxLength(1000);
                entity.HasIndex(e => e.DisplayOrder);
            });

            modelBuilder.Entity<DamageItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Text).HasMaxLength(1000);
                entity.HasIndex(e => e.DisplayOrder);
            });

            modelBuilder.Entity<GeneralTemplate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.InspectionType)
                    .WithMany()
                    .HasForeignKey(e => e.InspectionTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.InspectionTypeId, e.HasCleanlinessIssue, e.HasDamageIssue })
                    .IsUnique();
                entity.Property(e => e.Text).HasMaxLength(2000);
            });

            modelBuilder.Entity<AudienceTemplate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.InspectionType)
                    .WithMany()
                    .HasForeignKey(e => e.InspectionTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => new { e.InspectionTypeId, e.Audience }).IsUnique();
                entity.Property(e => e.NoIssueText).HasMaxLength(2000);
                entity.Property(e => e.IssuePrefix).HasMaxLength(1000);
                entity.Property(e => e.IssueSuffix).HasMaxLength(1000);
            });
        }
    }
}
