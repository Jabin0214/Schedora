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
        public DbSet<TenantContact> TenantContacts { get; set; }
        public DbSet<TaskType> TaskTypes { get; set; }
        public DbSet<TemplateInspectionType> TemplateInspectionTypes { get; set; }
        public DbSet<GeneralTemplate> GeneralTemplates { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Property>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Address).IsRequired().HasMaxLength(200);
                entity.HasIndex(p => p.Address);
            });

            modelBuilder.Entity<TenantContact>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.HasOne(c => c.Property)
                    .WithMany(p => p.TenantContacts)
                    .HasForeignKey(c => c.PropertyId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.Property(c => c.SourceAddress).IsRequired().HasMaxLength(200);
                entity.Property(c => c.Phone).HasMaxLength(80);
                entity.Property(c => c.Email).HasMaxLength(500);
                entity.Property(c => c.LeaseDateEnded).HasMaxLength(50);
                entity.HasIndex(c => c.PropertyId);
                entity.HasIndex(c => c.SourceAddress);
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

            modelBuilder.Entity<GeneralTemplate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasOne(e => e.InspectionType)
                    .WithMany()
                    .HasForeignKey(e => e.InspectionTypeId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(e => e.InspectionTypeId).IsUnique();
                entity.Property(e => e.Text).HasMaxLength(2000);
            });
        }
    }
}
