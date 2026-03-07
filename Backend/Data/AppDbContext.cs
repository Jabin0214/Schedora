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
        }
    }
}
