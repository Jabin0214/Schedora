# Quick Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/templates` page that lets the user pick conditions (inspection type, dirty cleanliness areas, broken items) and one-click copy assembled report text for General / Tenant / Landlord sections, with all template content editable from a management UI and persisted in the backend.

**Architecture:** Five new PostgreSQL tables created via `CREATE TABLE IF NOT EXISTS` in `Program.cs` startup (matching the existing `TaskTypes` pattern). New `TemplatesController` exposing `GET /api/templates/all` plus CRUD endpoints. Frontend page uses a pure `assemble()` function over fetched template data so previews update in real time; "Copy" buttons use `navigator.clipboard`. Template management lives in a modal with 4 tabs.

**Tech Stack:** ASP.NET Core 9 + EF Core (Npgsql) + PostgreSQL (Supabase) on the backend; React 19 + TypeScript + antd 6 + axios on the frontend.

**Spec:** [docs/superpowers/specs/2026-04-30-quick-templates-design.md](../specs/2026-04-30-quick-templates-design.md)

---

## File Touch Map

**New files:**
- `Backend/Models/Entities.cs` — extended (5 new classes)
- `Backend/Models/DTOs/TemplateDtos.cs`
- `Backend/Data/TemplatesStartupSql.cs`
- `Backend/Controllers/TemplatesController.cs`
- `Backend.Tests/TemplatesStartupSqlTests.cs`
- `Frontend/src/types/templates.ts`
- `Frontend/src/hooks/useTemplates.ts`
- `Frontend/src/utils/templateAssembly.ts`
- `Frontend/src/pages/TemplatesPage.tsx`
- `Frontend/src/components/TemplatesManager.tsx`

**Modified files:**
- `Backend/Data/AppDbContext.cs` — add 5 `DbSet`s + entity configuration
- `Backend/Data/DatabaseStartupSql.cs` — extend identity-sequence sync
- `Backend/Program.cs` — invoke `TemplatesStartupSql.Sql` on boot
- `Frontend/src/config/api.ts` — add `templates` endpoint
- `Frontend/src/App.tsx` — add `/templates` route + sidebar item

---

## Task 1: Add EF entity classes

**Files:**
- Modify: `Backend/Models/Entities.cs`

- [ ] **Step 1: Add the 5 entity classes**

Append the following to `Backend/Models/Entities.cs` (inside the existing `namespace InspectionApi.Models` block, after the existing classes):

```csharp
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
```

- [ ] **Step 2: Verify Backend builds**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds (warnings OK, no errors).

- [ ] **Step 3: Commit**

```bash
git add Backend/Models/Entities.cs
git commit -m "feat(backend): add template-feature entity classes"
```

---

## Task 2: Register entities in `AppDbContext`

**Files:**
- Modify: `Backend/Data/AppDbContext.cs`

- [ ] **Step 1: Add DbSets**

Inside `AppDbContext`, add these properties below the existing `DbSet<TaskType>`:

```csharp
        public DbSet<TemplateInspectionType> TemplateInspectionTypes { get; set; }
        public DbSet<CleanlinessArea> CleanlinessAreas { get; set; }
        public DbSet<DamageItem> DamageItems { get; set; }
        public DbSet<GeneralTemplate> GeneralTemplates { get; set; }
        public DbSet<AudienceTemplate> AudienceTemplates { get; set; }
```

- [ ] **Step 2: Add entity configuration in `OnModelCreating`**

Append inside `OnModelCreating` (after the existing `InspectionRecord` block):

```csharp
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
```

- [ ] **Step 3: Build**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add Backend/Data/AppDbContext.cs
git commit -m "feat(backend): register template entities in DbContext"
```

---

## Task 3: Create `TemplatesStartupSql` (raw SQL bootstrap)

**Files:**
- Create: `Backend/Data/TemplatesStartupSql.cs`

- [ ] **Step 1: Create the file**

Write `Backend/Data/TemplatesStartupSql.cs`:

```csharp
namespace InspectionApi.Data
{
    public static class TemplatesStartupSql
    {
        // Idempotent: safe to run on every app boot.
        // Creates 5 tables and seeds default rows. The composite unique
        // indexes guarantee that re-running INSERTs does nothing.
        public const string Sql = @"
            CREATE TABLE IF NOT EXISTS ""TemplateInspectionTypes"" (
                ""Id""           SERIAL                PRIMARY KEY,
                ""Name""         character varying(50) NOT NULL,
                ""DisplayOrder"" integer               NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""CleanlinessAreas"" (
                ""Id""           SERIAL                  PRIMARY KEY,
                ""Name""         character varying(50)   NOT NULL,
                ""DirtyText""    character varying(1000) NOT NULL DEFAULT '',
                ""DisplayOrder"" integer                 NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""DamageItems"" (
                ""Id""           SERIAL                  PRIMARY KEY,
                ""Name""         character varying(50)   NOT NULL,
                ""Text""         character varying(1000) NOT NULL DEFAULT '',
                ""DisplayOrder"" integer                 NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""GeneralTemplates"" (
                ""Id""                   SERIAL                  PRIMARY KEY,
                ""InspectionTypeId""     integer                 NOT NULL
                    REFERENCES ""TemplateInspectionTypes""(""Id"") ON DELETE CASCADE,
                ""HasCleanlinessIssue""  boolean                 NOT NULL,
                ""HasDamageIssue""       boolean                 NOT NULL,
                ""Text""                 character varying(2000) NOT NULL DEFAULT ''
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_GeneralTemplates_Combo""
                ON ""GeneralTemplates""(""InspectionTypeId"", ""HasCleanlinessIssue"", ""HasDamageIssue"");

            CREATE TABLE IF NOT EXISTS ""AudienceTemplates"" (
                ""Id""               SERIAL                  PRIMARY KEY,
                ""InspectionTypeId"" integer                 NOT NULL
                    REFERENCES ""TemplateInspectionTypes""(""Id"") ON DELETE CASCADE,
                ""Audience""         integer                 NOT NULL,
                ""NoIssueText""      character varying(2000) NOT NULL DEFAULT '',
                ""IssuePrefix""      character varying(1000) NOT NULL DEFAULT '',
                ""IssueSuffix""      character varying(1000) NOT NULL DEFAULT ''
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AudienceTemplates_Combo""
                ON ""AudienceTemplates""(""InspectionTypeId"", ""Audience"");

            -- Seed inspection types (idempotent via ON CONFLICT on Name)
            -- Use a temp INSERT that only fires if the table is empty.
            INSERT INTO ""TemplateInspectionTypes"" (""Name"", ""DisplayOrder"")
            SELECT v.name, v.ord FROM (VALUES
                ('搬入', 0),
                ('搬出', 1),
                ('例行检查', 2)
            ) AS v(name, ord)
            WHERE NOT EXISTS (SELECT 1 FROM ""TemplateInspectionTypes"");

            -- Seed cleanliness areas (only when table is empty)
            INSERT INTO ""CleanlinessAreas"" (""Name"", ""DirtyText"", ""DisplayOrder"")
            SELECT v.name, '', v.ord FROM (VALUES
                ('卫生间', 0),
                ('厨房',   1),
                ('卧室',   2),
                ('客厅',   3),
                ('阳台',   4)
            ) AS v(name, ord)
            WHERE NOT EXISTS (SELECT 1 FROM ""CleanlinessAreas"");

            -- Seed General + Audience rows for every existing inspection type
            -- that doesn't already have them. Idempotent.
            DO $$
            DECLARE
                t record;
                cl boolean;
                dm boolean;
                aud integer;
            BEGIN
                FOR t IN SELECT ""Id"" FROM ""TemplateInspectionTypes"" LOOP
                    FOR cl IN SELECT unnest(ARRAY[false, true]) LOOP
                        FOR dm IN SELECT unnest(ARRAY[false, true]) LOOP
                            INSERT INTO ""GeneralTemplates""
                                (""InspectionTypeId"", ""HasCleanlinessIssue"", ""HasDamageIssue"", ""Text"")
                            SELECT t.""Id"", cl, dm, ''
                            WHERE NOT EXISTS (
                                SELECT 1 FROM ""GeneralTemplates""
                                WHERE ""InspectionTypeId"" = t.""Id""
                                  AND ""HasCleanlinessIssue"" = cl
                                  AND ""HasDamageIssue"" = dm
                            );
                        END LOOP;
                    END LOOP;
                    FOR aud IN SELECT unnest(ARRAY[0, 1]) LOOP
                        INSERT INTO ""AudienceTemplates""
                            (""InspectionTypeId"", ""Audience"", ""NoIssueText"", ""IssuePrefix"", ""IssueSuffix"")
                        SELECT t.""Id"", aud, '', '', ''
                        WHERE NOT EXISTS (
                            SELECT 1 FROM ""AudienceTemplates""
                            WHERE ""InspectionTypeId"" = t.""Id""
                              AND ""Audience"" = aud
                        );
                    END LOOP;
                END LOOP;
            END $$;
        ";
    }
}
```

- [ ] **Step 2: Build**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add Backend/Data/TemplatesStartupSql.cs
git commit -m "feat(backend): add startup SQL for template tables"
```

---

## Task 4: Add startup-SQL test

**Files:**
- Create: `Backend.Tests/TemplatesStartupSqlTests.cs`

- [ ] **Step 1: Write test**

Create `Backend.Tests/TemplatesStartupSqlTests.cs`:

```csharp
using InspectionApi.Data;

namespace Backend.Tests;

public class TemplatesStartupSqlTests
{
    [Fact]
    public void CreatesAllFiveTables()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("\"TemplateInspectionTypes\"", sql);
        Assert.Contains("\"CleanlinessAreas\"", sql);
        Assert.Contains("\"DamageItems\"", sql);
        Assert.Contains("\"GeneralTemplates\"", sql);
        Assert.Contains("\"AudienceTemplates\"", sql);
    }

    [Fact]
    public void UsesIfNotExistsForIdempotency()
    {
        // All CREATE TABLE statements must be IF NOT EXISTS so startup is safe to re-run.
        var sql = TemplatesStartupSql.Sql;
        var createCount = System.Text.RegularExpressions.Regex
            .Matches(sql, "CREATE TABLE IF NOT EXISTS").Count;
        Assert.Equal(5, createCount);
    }

    [Fact]
    public void SeedsThreeDefaultInspectionTypes()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("'搬入'", sql);
        Assert.Contains("'搬出'", sql);
        Assert.Contains("'例行检查'", sql);
    }

    [Fact]
    public void SeedsFiveDefaultCleanlinessAreas()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("'卫生间'", sql);
        Assert.Contains("'厨房'", sql);
        Assert.Contains("'卧室'", sql);
        Assert.Contains("'客厅'", sql);
        Assert.Contains("'阳台'", sql);
    }
}
```

- [ ] **Step 2: Run test**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~TemplatesStartupSqlTests`
Expected: 4 passing tests.

- [ ] **Step 3: Commit**

```bash
git add Backend.Tests/TemplatesStartupSqlTests.cs
git commit -m "test(backend): verify TemplatesStartupSql contents"
```

---

## Task 5: Wire up startup SQL in `Program.cs`

**Files:**
- Modify: `Backend/Program.cs`

- [ ] **Step 1: Add SQL execution**

In `Backend/Program.cs`, locate the line that logs "✅ TaskTypes table ready" (around line 76). Insert this block immediately after that block, before the `ParkingFee` block:

```csharp
            // Create template feature tables and seed defaults if not present
            await db.Database.ExecuteSqlRawAsync(TemplatesStartupSql.Sql);
            logger.LogInformation("✅ Template tables ready");
```

- [ ] **Step 2: Build & start app**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds.

Then run the app once:
```bash
dotnet run --project Backend/InspectionApi.csproj &
sleep 8
curl -s http://localhost:5097/api/health
kill %1 2>/dev/null
```
Expected output includes `"status":"ok"` AND the log shows `✅ Template tables ready`. If the database is unreachable, that's still acceptable per the existing pattern (warning logged, app continues).

- [ ] **Step 3: Commit**

```bash
git add Backend/Program.cs
git commit -m "feat(backend): bootstrap template tables on app startup"
```

---

## Task 6: Extend identity-sequence sync

**Files:**
- Modify: `Backend/Data/DatabaseStartupSql.cs`

- [ ] **Step 1: Add sequences for the 5 new tables**

In `Backend/Data/DatabaseStartupSql.cs`, inside the `DO $$ ... END $$` block, add 5 more table sync stanzas after the existing `InspectionTasks` block (before the closing `END $$`):

```sql
                    -- TemplateInspectionTypes
                    seq := pg_get_serial_sequence('""TemplateInspectionTypes""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""TemplateInspectionTypes"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- CleanlinessAreas
                    seq := pg_get_serial_sequence('""CleanlinessAreas""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""CleanlinessAreas"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- DamageItems
                    seq := pg_get_serial_sequence('""DamageItems""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""DamageItems"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- GeneralTemplates
                    seq := pg_get_serial_sequence('""GeneralTemplates""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""GeneralTemplates"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- AudienceTemplates
                    seq := pg_get_serial_sequence('""AudienceTemplates""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""AudienceTemplates"";
                        PERFORM setval(seq, nval, false);
                    END IF;
```

(The existing C# string is C# verbatim with `""` for embedded quotes — match that escaping.)

- [ ] **Step 2: Update existing test for coverage**

Edit `Backend.Tests/DatabaseStartupSqlTests.cs` — append:

```csharp
    [Fact]
    public void IdentitySequenceSyncIncludesTemplateTables()
    {
        var sql = DatabaseStartupSql.IdentitySequenceSyncSql;
        Assert.Contains("\"TemplateInspectionTypes\"", sql);
        Assert.Contains("\"CleanlinessAreas\"", sql);
        Assert.Contains("\"DamageItems\"", sql);
        Assert.Contains("\"GeneralTemplates\"", sql);
        Assert.Contains("\"AudienceTemplates\"", sql);
    }
```

- [ ] **Step 3: Run tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj`
Expected: All tests pass (the new test plus the existing one plus Task 4's tests).

- [ ] **Step 4: Commit**

```bash
git add Backend/Data/DatabaseStartupSql.cs Backend.Tests/DatabaseStartupSqlTests.cs
git commit -m "feat(backend): include template tables in sequence sync"
```

---

## Task 7: Create DTOs

**Files:**
- Create: `Backend/Models/DTOs/TemplateDtos.cs`

- [ ] **Step 1: Write DTO file**

Create `Backend/Models/DTOs/TemplateDtos.cs`:

```csharp
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
```

- [ ] **Step 2: Build**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add Backend/Models/DTOs/TemplateDtos.cs
git commit -m "feat(backend): add DTOs for templates API"
```

---

## Task 8: Create `TemplatesController`

**Files:**
- Create: `Backend/Controllers/TemplatesController.cs`

- [ ] **Step 1: Write controller**

Create `Backend/Controllers/TemplatesController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TemplatesController> _logger;

        public TemplatesController(AppDbContext context, ILogger<TemplatesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/templates/all
        [HttpGet("all")]
        public async Task<ActionResult<TemplatesAllDto>> GetAll()
        {
            var dto = new TemplatesAllDto
            {
                InspectionTypes   = await _context.TemplateInspectionTypes.OrderBy(t => t.DisplayOrder).ToListAsync(),
                CleanlinessAreas  = await _context.CleanlinessAreas.OrderBy(a => a.DisplayOrder).ToListAsync(),
                DamageItems       = await _context.DamageItems.OrderBy(d => d.DisplayOrder).ToListAsync(),
                GeneralTemplates  = await _context.GeneralTemplates.AsNoTracking().ToListAsync(),
                AudienceTemplates = await _context.AudienceTemplates.AsNoTracking().ToListAsync(),
            };
            return Ok(dto);
        }

        // ─── InspectionTypes ─────────────────────────────────────

        [HttpPost("inspection-types")]
        public async Task<ActionResult<TemplateInspectionType>> CreateInspectionType(
            [FromBody] TemplateInspectionTypeCreateDto dto)
        {
            var count = await _context.TemplateInspectionTypes.CountAsync();
            var type = new TemplateInspectionType
            {
                Name = dto.Name.Trim(),
                DisplayOrder = count,
            };
            _context.TemplateInspectionTypes.Add(type);
            await _context.SaveChangesAsync();

            // Auto-create the 4 GeneralTemplate + 2 AudienceTemplate rows.
            for (int i = 0; i < 4; i++)
            {
                _context.GeneralTemplates.Add(new GeneralTemplate
                {
                    InspectionTypeId = type.Id,
                    HasCleanlinessIssue = (i & 1) != 0,
                    HasDamageIssue = (i & 2) != 0,
                    Text = string.Empty,
                });
            }
            foreach (TemplateAudience aud in new[] { TemplateAudience.Tenant, TemplateAudience.Landlord })
            {
                _context.AudienceTemplates.Add(new AudienceTemplate
                {
                    InspectionTypeId = type.Id,
                    Audience = aud,
                });
            }
            await _context.SaveChangesAsync();

            _logger.LogInformation("Inspection type created: {Name} (Id={Id})", type.Name, type.Id);
            return Ok(type);
        }

        [HttpPut("inspection-types/{id}")]
        public async Task<IActionResult> UpdateInspectionType(int id, [FromBody] TemplateInspectionTypeUpdateDto dto)
        {
            var type = await _context.TemplateInspectionTypes.FindAsync(id);
            if (type == null) return NotFound();
            type.Name = dto.Name.Trim();
            type.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("inspection-types/{id}")]
        public async Task<IActionResult> DeleteInspectionType(int id)
        {
            var type = await _context.TemplateInspectionTypes.FindAsync(id);
            if (type == null) return NotFound();
            _context.TemplateInspectionTypes.Remove(type); // cascades to General/Audience
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── CleanlinessAreas ────────────────────────────────────

        [HttpPost("cleanliness-areas")]
        public async Task<ActionResult<CleanlinessArea>> CreateArea([FromBody] CleanlinessAreaCreateDto dto)
        {
            var count = await _context.CleanlinessAreas.CountAsync();
            var area = new CleanlinessArea
            {
                Name = dto.Name.Trim(),
                DirtyText = dto.DirtyText,
                DisplayOrder = count,
            };
            _context.CleanlinessAreas.Add(area);
            await _context.SaveChangesAsync();
            return Ok(area);
        }

        [HttpPut("cleanliness-areas/{id}")]
        public async Task<IActionResult> UpdateArea(int id, [FromBody] CleanlinessAreaUpdateDto dto)
        {
            var area = await _context.CleanlinessAreas.FindAsync(id);
            if (area == null) return NotFound();
            area.Name = dto.Name.Trim();
            area.DirtyText = dto.DirtyText;
            area.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("cleanliness-areas/{id}")]
        public async Task<IActionResult> DeleteArea(int id)
        {
            var area = await _context.CleanlinessAreas.FindAsync(id);
            if (area == null) return NotFound();
            _context.CleanlinessAreas.Remove(area);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── DamageItems ─────────────────────────────────────────

        [HttpPost("damage-items")]
        public async Task<ActionResult<DamageItem>> CreateDamage([FromBody] DamageItemCreateDto dto)
        {
            var count = await _context.DamageItems.CountAsync();
            var item = new DamageItem
            {
                Name = dto.Name.Trim(),
                Text = dto.Text,
                DisplayOrder = count,
            };
            _context.DamageItems.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("damage-items/{id}")]
        public async Task<IActionResult> UpdateDamage(int id, [FromBody] DamageItemUpdateDto dto)
        {
            var item = await _context.DamageItems.FindAsync(id);
            if (item == null) return NotFound();
            item.Name = dto.Name.Trim();
            item.Text = dto.Text;
            item.DisplayOrder = dto.DisplayOrder;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("damage-items/{id}")]
        public async Task<IActionResult> DeleteDamage(int id)
        {
            var item = await _context.DamageItems.FindAsync(id);
            if (item == null) return NotFound();
            _context.DamageItems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── GeneralTemplate text update ─────────────────────────

        [HttpPut("general/{id}")]
        public async Task<IActionResult> UpdateGeneral(int id, [FromBody] GeneralTemplateUpdateDto dto)
        {
            var row = await _context.GeneralTemplates.FindAsync(id);
            if (row == null) return NotFound();
            row.Text = dto.Text;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ─── AudienceTemplate text update ────────────────────────

        [HttpPut("audience/{id}")]
        public async Task<IActionResult> UpdateAudience(int id, [FromBody] AudienceTemplateUpdateDto dto)
        {
            var row = await _context.AudienceTemplates.FindAsync(id);
            if (row == null) return NotFound();
            row.NoIssueText = dto.NoIssueText;
            row.IssuePrefix = dto.IssuePrefix;
            row.IssueSuffix = dto.IssueSuffix;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
```

- [ ] **Step 2: Build & smoke-test**

Run: `dotnet build Backend/InspectionApi.csproj`
Expected: Build succeeds.

Then start the app and hit the new endpoint:
```bash
dotnet run --project Backend/InspectionApi.csproj &
sleep 8
curl -s http://localhost:5097/api/templates/all | head -c 500
kill %1 2>/dev/null
```
Expected: JSON with `inspectionTypes` (3 entries: 搬入/搬出/例行检查), `cleanlinessAreas` (5 entries), `damageItems` ([]), `generalTemplates` (12 entries), `audienceTemplates` (6 entries).

- [ ] **Step 3: Commit**

```bash
git add Backend/Controllers/TemplatesController.cs
git commit -m "feat(backend): add TemplatesController with CRUD + aggregate fetch"
```

---

## Task 9: Add frontend TypeScript types & API endpoint

**Files:**
- Create: `Frontend/src/types/templates.ts`
- Modify: `Frontend/src/config/api.ts`

- [ ] **Step 1: Add types**

Create `Frontend/src/types/templates.ts`:

```typescript
export interface TemplateInspectionType {
  id: number;
  name: string;
  displayOrder: number;
}

export interface CleanlinessArea {
  id: number;
  name: string;
  dirtyText: string;
  displayOrder: number;
}

export interface DamageItem {
  id: number;
  name: string;
  text: string;
  displayOrder: number;
}

export interface GeneralTemplate {
  id: number;
  inspectionTypeId: number;
  hasCleanlinessIssue: boolean;
  hasDamageIssue: boolean;
  text: string;
}

export const TemplateAudience = {
  Tenant: 0,
  Landlord: 1,
} as const;
export type TemplateAudience = typeof TemplateAudience[keyof typeof TemplateAudience];

export interface AudienceTemplate {
  id: number;
  inspectionTypeId: number;
  audience: TemplateAudience;
  noIssueText: string;
  issuePrefix: string;
  issueSuffix: string;
}

export interface TemplatesAll {
  inspectionTypes: TemplateInspectionType[];
  cleanlinessAreas: CleanlinessArea[];
  damageItems: DamageItem[];
  generalTemplates: GeneralTemplate[];
  audienceTemplates: AudienceTemplate[];
}

export interface AssemblyState {
  inspectionTypeId: number | null;
  selectedAreaIds: number[];
  selectedDamageItemIds: number[];
  customDamageEntries: string[];
}

export interface AssembledOutput {
  generalText: string;
  tenantText: string;
  landlordText: string;
}
```

- [ ] **Step 2: Add API endpoint constant**

Modify `Frontend/src/config/api.ts`. Append to `API_ENDPOINTS`:

```typescript
  templates: `${API_BASE_URL}/templates`,
```

The full updated `API_ENDPOINTS` block should be:

```typescript
export const API_ENDPOINTS = {
  properties: `${API_BASE_URL}/properties`,
  inspectionTasks: `${API_BASE_URL}/inspectiontasks`,
  inspectionRecords: `${API_BASE_URL}/inspectionrecords`,
  reports: `${API_BASE_URL}/reports`,
  googleSync: `${API_BASE_URL}/googlesync`,
  taskTypes: `${API_BASE_URL}/tasktypes`,
  templates: `${API_BASE_URL}/templates`,
} as const;
```

- [ ] **Step 3: Build**

Run: `cd Frontend && npx tsc -b`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/types/templates.ts Frontend/src/config/api.ts
git commit -m "feat(frontend): add template types and API endpoint"
```

---

## Task 10: Implement assembly pure function

**Files:**
- Create: `Frontend/src/utils/templateAssembly.ts`

- [ ] **Step 1: Write the function**

Create `Frontend/src/utils/templateAssembly.ts`:

```typescript
import type {
  TemplatesAll,
  AssemblyState,
  AssembledOutput,
  CleanlinessArea,
  DamageItem,
} from '../types/templates';
import { TemplateAudience } from '../types/templates';

const EMPTY_OUTPUT: AssembledOutput = { generalText: '', tenantText: '', landlordText: '' };

export function assemble(state: AssemblyState, data: TemplatesAll): AssembledOutput {
  if (state.inspectionTypeId == null) return EMPTY_OUTPUT;

  const hasCleanlinessIssue = state.selectedAreaIds.length > 0;
  const hasDamageIssue =
    state.selectedDamageItemIds.length > 0 ||
    state.customDamageEntries.some(s => s.trim().length > 0);

  // ── General ────────────────────────────────────────────────
  const general = data.generalTemplates.find(g =>
    g.inspectionTypeId === state.inspectionTypeId &&
    g.hasCleanlinessIssue === hasCleanlinessIssue &&
    g.hasDamageIssue === hasDamageIssue
  );
  const generalText = general?.text ?? '';

  // ── Tenant ─────────────────────────────────────────────────
  const tenantTpl = data.audienceTemplates.find(a =>
    a.inspectionTypeId === state.inspectionTypeId &&
    a.audience === TemplateAudience.Tenant
  );
  const tenantText = tenantTpl
    ? hasCleanlinessIssue
      ? joinNonEmpty([
          tenantTpl.issuePrefix,
          ...orderedAreas(data.cleanlinessAreas, state.selectedAreaIds).map(a => a.dirtyText),
          tenantTpl.issueSuffix,
        ])
      : tenantTpl.noIssueText
    : '';

  // ── Landlord ───────────────────────────────────────────────
  const landlordTpl = data.audienceTemplates.find(a =>
    a.inspectionTypeId === state.inspectionTypeId &&
    a.audience === TemplateAudience.Landlord
  );
  const landlordText = landlordTpl
    ? hasDamageIssue
      ? joinNonEmpty([
          landlordTpl.issuePrefix,
          ...orderedDamage(data.damageItems, state.selectedDamageItemIds).map(d => d.text),
          ...state.customDamageEntries.map(s => s.trim()).filter(s => s.length > 0),
          landlordTpl.issueSuffix,
        ])
      : landlordTpl.noIssueText
    : '';

  return { generalText, tenantText, landlordText };
}

function orderedAreas(all: CleanlinessArea[], ids: number[]): CleanlinessArea[] {
  const set = new Set(ids);
  return all.filter(a => set.has(a.id));    // preserves displayOrder of `all`
}

function orderedDamage(all: DamageItem[], ids: number[]): DamageItem[] {
  const set = new Set(ids);
  return all.filter(d => set.has(d.id));
}

function joinNonEmpty(parts: string[]): string {
  return parts.filter(p => p && p.length > 0).join('\n');
}
```

- [ ] **Step 2: Type-check**

Run: `cd Frontend && npx tsc -b`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/utils/templateAssembly.ts
git commit -m "feat(frontend): add template assembly pure function"
```

---

## Task 11: Implement `useTemplates` hook

**Files:**
- Create: `Frontend/src/hooks/useTemplates.ts`

- [ ] **Step 1: Write the hook**

Create `Frontend/src/hooks/useTemplates.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import type { TemplatesAll } from '../types/templates';

let cache: TemplatesAll | null = null;
let inflight: Promise<TemplatesAll> | null = null;

async function load(): Promise<TemplatesAll> {
  if (cache) return cache;
  if (!inflight) {
    inflight = axios
      .get<TemplatesAll>(`${API_ENDPOINTS.templates}/all`)
      .then(r => {
        cache = r.data;
        inflight = null;
        return r.data;
      })
      .catch(err => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function invalidateTemplatesCache() {
  cache = null;
  inflight = null;
}

export function useTemplates() {
  const [data, setData] = useState<TemplatesAll | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(() => {
    invalidateTemplatesCache();
    setLoading(true);
    setError(null);
    load()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!cache) {
      load()
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e); setLoading(false); });
    }
  }, []);

  return { data, loading, error, refresh };
}
```

- [ ] **Step 2: Type-check**

Run: `cd Frontend && npx tsc -b`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/hooks/useTemplates.ts
git commit -m "feat(frontend): add useTemplates hook with module-level cache"
```

---

## Task 12: Build the daily-use `TemplatesPage`

**Files:**
- Create: `Frontend/src/pages/TemplatesPage.tsx`

- [ ] **Step 1: Write the page**

Create `Frontend/src/pages/TemplatesPage.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Card, Radio, Checkbox, Button, Input, Empty, Spin, Space, message } from 'antd';
import { CopyOutlined, SettingOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useTemplates } from '../hooks/useTemplates';
import { assemble } from '../utils/templateAssembly';
import { IndTitle } from '../components/shared';
import TemplatesManager from '../components/TemplatesManager';
import type { AssemblyState } from '../types/templates';

const TemplatesPage: React.FC = () => {
  const { data, loading, error, refresh } = useTemplates();
  const [showManager, setShowManager] = useState(false);

  const [state, setState] = useState<AssemblyState>({
    inspectionTypeId: null,
    selectedAreaIds: [],
    selectedDamageItemIds: [],
    customDamageEntries: [],
  });
  const [customInput, setCustomInput] = useState('');

  const output = useMemo(() => {
    if (!data) return { generalText: '', tenantText: '', landlordText: '' };
    return assemble(state, data);
  }, [state, data]);

  // Default-select first inspection type once data arrives
  React.useEffect(() => {
    if (data && state.inspectionTypeId == null && data.inspectionTypes.length > 0) {
      setState(s => ({ ...s, inspectionTypeId: data.inspectionTypes[0].id }));
    }
  }, [data, state.inspectionTypeId]);

  const copy = async (label: string, text: string) => {
    if (!text) {
      message.warning('内容为空');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${label} 已复制`);
    } catch {
      message.error('复制失败');
    }
  };

  const addCustomDamage = () => {
    const v = customInput.trim();
    if (!v) return;
    setState(s => ({ ...s, customDamageEntries: [...s.customDamageEntries, v] }));
    setCustomInput('');
  };

  const removeCustomDamage = (i: number) => {
    setState(s => ({
      ...s,
      customDamageEntries: s.customDamageEntries.filter((_, idx) => idx !== i),
    }));
  };

  if (loading) return <Spin />;
  if (error || !data) {
    return (
      <Empty description="加载模板失败">
        <Button onClick={refresh}>重试</Button>
      </Empty>
    );
  }
  if (data.inspectionTypes.length === 0) {
    return <Empty description="还没有检查类型，先去管理模板里加一个" />;
  }

  const previewStyle: React.CSSProperties = {
    background: '#F7F7F5',
    border: '1px solid #E9E9E7',
    borderRadius: 4,
    padding: 12,
    minHeight: 80,
    whiteSpace: 'pre-wrap',
    fontSize: 13,
    color: '#37352F',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <IndTitle>快速模板</IndTitle>
        <Button icon={<SettingOutlined />} onClick={() => setShowManager(true)}>
          管理模板
        </Button>
      </div>

      {/* Inspection-type selector */}
      <div style={{ marginBottom: 16 }}>
        <Radio.Group
          value={state.inspectionTypeId ?? undefined}
          onChange={e => setState(s => ({ ...s, inspectionTypeId: e.target.value }))}
          optionType="button"
          buttonStyle="solid"
          options={data.inspectionTypes.map(t => ({ label: t.name, value: t.id }))}
        />
      </div>

      {/* General output */}
      <Card title="General 整体描述" size="small" style={{ marginBottom: 16 }}>
        <div style={previewStyle}>{output.generalText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}</div>
        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={() => copy('General', output.generalText)}
          style={{ marginTop: 8 }}
        >
          复制
        </Button>
      </Card>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Tenant column */}
        <Card title="给房客（卫生）" size="small" style={{ flex: 1, minWidth: 320 }}>
          <Checkbox.Group
            value={state.selectedAreaIds}
            onChange={vals => setState(s => ({ ...s, selectedAreaIds: vals as number[] }))}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            options={data.cleanlinessAreas.map(a => ({ label: a.name, value: a.id }))}
          />
          <div style={{ ...previewStyle, marginTop: 12 }}>
            {output.tenantText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copy('给房客', output.tenantText)}
            style={{ marginTop: 8 }}
          >
            复制
          </Button>
        </Card>

        {/* Landlord column */}
        <Card title="给房东（损坏）" size="small" style={{ flex: 1, minWidth: 320 }}>
          <Checkbox.Group
            value={state.selectedDamageItemIds}
            onChange={vals => setState(s => ({ ...s, selectedDamageItemIds: vals as number[] }))}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            options={data.damageItems.map(d => ({ label: d.name, value: d.id }))}
          />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>+ 自定义损坏项：</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onPressEnter={addCustomDamage}
                placeholder="例如：阳台栏杆松动"
              />
              <Button icon={<PlusOutlined />} onClick={addCustomDamage}>添加</Button>
            </Space.Compact>
            {state.customDamageEntries.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                {state.customDamageEntries.map((entry, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#37352F' }}>
                    <span style={{ flex: 1 }}>• {entry}</span>
                    <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => removeCustomDamage(i)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ ...previewStyle, marginTop: 12 }}>
            {output.landlordText || <span style={{ color: '#ACABA9' }}>（无文字）</span>}
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => copy('给房东', output.landlordText)}
            style={{ marginTop: 8 }}
          >
            复制
          </Button>
        </Card>
      </div>

      {showManager && (
        <TemplatesManager
          data={data}
          onClose={() => setShowManager(false)}
          onChanged={refresh}
        />
      )}
    </div>
  );
};

export default TemplatesPage;
```

- [ ] **Step 2: Type-check**

Run: `cd Frontend && npx tsc -b`
Expected: TypeScript will complain that `TemplatesManager` doesn't exist yet. That's fine — fix it in the next task.

- [ ] **Step 3: Commit (skip type check failure for this commit)**

```bash
git add Frontend/src/pages/TemplatesPage.tsx
git commit -m "feat(frontend): add quick-templates daily-use page"
```

---

## Task 13: Build `TemplatesManager` modal

**Files:**
- Create: `Frontend/src/components/TemplatesManager.tsx`

- [ ] **Step 1: Write the manager**

Create `Frontend/src/components/TemplatesManager.tsx`:

```tsx
import React, { useState } from 'react';
import { Modal, Tabs, List, Button, Input, Popconfirm, message, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import { modalStyles } from './shared';
import type {
  TemplatesAll,
  TemplateInspectionType,
  CleanlinessArea,
  DamageItem,
  GeneralTemplate,
  AudienceTemplate,
} from '../types/templates';
import { TemplateAudience } from '../types/templates';

interface Props {
  data: TemplatesAll;
  onClose: () => void;
  onChanged: () => void;
}

const { TextArea } = Input;

const TemplatesManager: React.FC<Props> = ({ data, onClose, onChanged }) => {
  return (
    <Modal
      open
      title="管理模板"
      onCancel={onClose}
      footer={null}
      width={900}
      styles={modalStyles}
    >
      <Tabs
        items={[
          { key: 'types',     label: '检查类型',          children: <InspectionTypesTab data={data} onChanged={onChanged} /> },
          { key: 'areas',     label: '卫生区域',          children: <AreasTab data={data} onChanged={onChanged} /> },
          { key: 'damage',    label: '损坏项目',          children: <DamageTab data={data} onChanged={onChanged} /> },
          { key: 'wrappers',  label: '整体描述 & 包装语', children: <WrappersTab data={data} onChanged={onChanged} /> },
        ]}
      />
    </Modal>
  );
};

// ─── Inspection Types ─────────────────────────────────────────

const InspectionTypesTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/inspection-types`, { name: v });
      setNewName('');
      message.success('已添加');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (t: TemplateInspectionType, name: string) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/inspection-types/${t.id}`, {
        name, displayOrder: t.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/inspection-types/${id}`);
      message.success('已删除');
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：年中检查"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.inspectionTypes}
        renderItem={(t) => (
          <List.Item
            actions={[
              <Popconfirm
                key="del"
                title="删除该类型？相关的整体描述和包装语会一起删除"
                onConfirm={() => remove(t.id)}
              >
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            <Input
              defaultValue={t.name}
              onBlur={e => { if (e.target.value.trim() && e.target.value !== t.name) update(t, e.target.value.trim()); }}
              variant="borderless"
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Cleanliness Areas ────────────────────────────────────────

const AreasTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/cleanliness-areas`, { name: v, dirtyText: '' });
      setNewName('');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (a: CleanlinessArea, patch: Partial<CleanlinessArea>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/cleanliness-areas/${a.id}`, {
        name: patch.name ?? a.name,
        dirtyText: patch.dirtyText ?? a.dirtyText,
        displayOrder: a.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/cleanliness-areas/${id}`);
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：花园"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.cleanlinessAreas}
        renderItem={(a) => (
          <List.Item style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Input
                defaultValue={a.name}
                onBlur={e => { if (e.target.value.trim() && e.target.value !== a.name) update(a, { name: e.target.value.trim() }); }}
                style={{ flex: 1 }}
              />
              <Popconfirm title="删除该区域？" onConfirm={() => remove(a.id)}>
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <TextArea
              defaultValue={a.dirtyText}
              placeholder="脏话术片段（被勾选时插入到给房客文字里）"
              autoSize={{ minRows: 2, maxRows: 6 }}
              onBlur={e => { if (e.target.value !== a.dirtyText) update(a, { dirtyText: e.target.value }); }}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Damage Items ─────────────────────────────────────────────

const DamageTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  const [newName, setNewName] = useState('');

  const create = async () => {
    const v = newName.trim();
    if (!v) return;
    try {
      await axios.post(`${API_ENDPOINTS.templates}/damage-items`, { name: v, text: '' });
      setNewName('');
      onChanged();
    } catch { message.error('添加失败'); }
  };

  const update = async (d: DamageItem, patch: Partial<DamageItem>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/damage-items/${d.id}`, {
        name: patch.name ?? d.name,
        text: patch.text ?? d.text,
        displayOrder: d.displayOrder,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };

  const remove = async (id: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.templates}/damage-items/${id}`);
      onChanged();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <Input.Group compact style={{ marginBottom: 12 }}>
        <Input
          style={{ width: 'calc(100% - 90px)' }}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onPressEnter={create}
          placeholder="例如：灯坏了"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={create}>添加</Button>
      </Input.Group>

      <List
        bordered
        dataSource={data.damageItems}
        locale={{ emptyText: '还没有损坏项目' }}
        renderItem={(d) => (
          <List.Item style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Input
                defaultValue={d.name}
                onBlur={e => { if (e.target.value.trim() && e.target.value !== d.name) update(d, { name: e.target.value.trim() }); }}
                style={{ flex: 1 }}
              />
              <Popconfirm title="删除该项？" onConfirm={() => remove(d.id)}>
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
            <TextArea
              defaultValue={d.text}
              placeholder="话术片段（被勾选时插入到给房东文字里）"
              autoSize={{ minRows: 2, maxRows: 6 }}
              onBlur={e => { if (e.target.value !== d.text) update(d, { text: e.target.value }); }}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

// ─── Wrappers (General + Audience) ────────────────────────────

const WrappersTab: React.FC<{ data: TemplatesAll; onChanged: () => void }> = ({ data, onChanged }) => {
  return (
    <Collapse
      items={data.inspectionTypes.map(t => ({
        key: String(t.id),
        label: t.name,
        children: (
          <div>
            <h4 style={{ marginTop: 0 }}>整体描述（4 种状态）</h4>
            {orderedGeneral(data.generalTemplates, t.id).map(g => (
              <GeneralRow key={g.id} g={g} onChanged={onChanged} />
            ))}
            <h4>给房客 / 给房东</h4>
            {orderedAudience(data.audienceTemplates, t.id).map(a => (
              <AudienceCard key={a.id} a={a} onChanged={onChanged} />
            ))}
          </div>
        ),
      }))}
    />
  );
};

function orderedGeneral(all: GeneralTemplate[], typeId: number): GeneralTemplate[] {
  return all
    .filter(g => g.inspectionTypeId === typeId)
    .sort((x, y) =>
      (Number(x.hasCleanlinessIssue) - Number(y.hasCleanlinessIssue)) * 2 +
      (Number(x.hasDamageIssue) - Number(y.hasDamageIssue))
    );
}

function orderedAudience(all: AudienceTemplate[], typeId: number): AudienceTemplate[] {
  return all
    .filter(a => a.inspectionTypeId === typeId)
    .sort((x, y) => x.audience - y.audience);
}

const GeneralRow: React.FC<{ g: GeneralTemplate; onChanged: () => void }> = ({ g, onChanged }) => {
  const label = `${g.hasCleanlinessIssue ? '有' : '无'}卫生问题 / ${g.hasDamageIssue ? '有' : '无'}损坏问题`;
  const save = async (text: string) => {
    if (text === g.text) return;
    try {
      await axios.put(`${API_ENDPOINTS.templates}/general/${g.id}`, { text });
      onChanged();
    } catch { message.error('保存失败'); }
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>{label}</div>
      <TextArea
        defaultValue={g.text}
        autoSize={{ minRows: 2, maxRows: 8 }}
        onBlur={e => save(e.target.value)}
      />
    </div>
  );
};

const AudienceCard: React.FC<{ a: AudienceTemplate; onChanged: () => void }> = ({ a, onChanged }) => {
  const title = a.audience === TemplateAudience.Tenant ? '给房客' : '给房东';
  const save = async (patch: Partial<AudienceTemplate>) => {
    try {
      await axios.put(`${API_ENDPOINTS.templates}/audience/${a.id}`, {
        noIssueText: patch.noIssueText ?? a.noIssueText,
        issuePrefix: patch.issuePrefix ?? a.issuePrefix,
        issueSuffix: patch.issueSuffix ?? a.issueSuffix,
      });
      onChanged();
    } catch { message.error('保存失败'); }
  };
  return (
    <div style={{ border: '1px solid #E9E9E7', borderRadius: 4, padding: 12, marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>无问题时整段话</div>
      <TextArea
        defaultValue={a.noIssueText}
        autoSize={{ minRows: 2, maxRows: 6 }}
        onBlur={e => { if (e.target.value !== a.noIssueText) save({ noIssueText: e.target.value }); }}
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 开头</div>
      <TextArea
        defaultValue={a.issuePrefix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onBlur={e => { if (e.target.value !== a.issuePrefix) save({ issuePrefix: e.target.value }); }}
        style={{ marginBottom: 8 }}
      />
      <div style={{ fontSize: 12, color: '#787774', marginBottom: 4 }}>有问题时 — 结尾</div>
      <TextArea
        defaultValue={a.issueSuffix}
        autoSize={{ minRows: 1, maxRows: 4 }}
        onBlur={e => { if (e.target.value !== a.issueSuffix) save({ issueSuffix: e.target.value }); }}
      />
    </div>
  );
};

export default TemplatesManager;
```

- [ ] **Step 2: Type-check**

Run: `cd Frontend && npx tsc -b`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/components/TemplatesManager.tsx
git commit -m "feat(frontend): add TemplatesManager modal with 4 tabs"
```

---

## Task 14: Wire route + sidebar item

**Files:**
- Modify: `Frontend/src/App.tsx`

- [ ] **Step 1: Add import + nav + route**

In `Frontend/src/App.tsx`:

1. Add a new import alongside the other page imports (after `InspectPage`):

```tsx
import TemplatesPage from './pages/TemplatesPage';
```

2. Add an icon import — extend the `@ant-design/icons` import line to include `CopyOutlined`:

```tsx
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  EditOutlined,
  CopyOutlined,
} from '@ant-design/icons';
```

3. Update `selectedKey` memo to include the new route:

```tsx
  const selectedKey = useMemo(() => {
    if (location.pathname === '/tasks') return '2';
    if (location.pathname === '/inspect') return '6';
    if (location.pathname === '/templates') return '7';
    if (location.pathname === '/calendar') return '3';
    if (location.pathname === '/history') return '4';
    if (location.pathname === '/config') return '5';
    return '1';
  }, [location.pathname]);
```

4. Add a Menu item — insert this entry into the `items` array immediately after the `'6'` (Inspect) item:

```tsx
            { key: '7', icon: <CopyOutlined />,          label: <Link to="/templates">Templates</Link> },
```

5. Add the route — inside `<Routes>`, add immediately after the `/inspect` route:

```tsx
                <Route path="/templates" element={<TemplatesPage />} />
```

- [ ] **Step 2: Type-check + build**

Run: `cd Frontend && npx tsc -b && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/App.tsx
git commit -m "feat(frontend): register /templates route and sidebar link"
```

---

## Task 15: End-to-end manual verification

**Files:** none modified

- [ ] **Step 1: Start backend**

Run in one terminal:
```bash
dotnet run --project Backend/InspectionApi.csproj
```
Expected logs include `✅ Template tables ready`.

- [ ] **Step 2: Start frontend dev server**

Run in another terminal:
```bash
cd Frontend && npm run dev
```
Open the URL it prints (typically http://localhost:5173).

- [ ] **Step 3: Walk through the daily-use flow**

1. Click **Templates** in the sidebar.
2. Verify default inspection type (搬入) is auto-selected and 5 cleanliness areas are listed (卫生间/厨房/卧室/客厅/阳台).
3. Open ⚙ "管理模板":
   - Tab "卫生区域": pick 卫生间, fill in `DirtyText` like `卫生间地面有污渍，洗手台有水垢` → click outside to save.
   - Tab "损坏项目": add a new item "灯坏了", fill its `Text` like `主卧吊灯不亮，需更换` → save.
   - Tab "整体描述 & 包装语": expand 搬入 → set the 4 General texts (e.g. for "无卫生问题/无损坏问题": `本次搬入检查整体情况良好。`) and the 给房客 / 给房东 wrappers (e.g. 房客 NoIssueText: `房屋整体卫生过得去，谢谢配合。`, IssuePrefix: `本次搬入检查发现以下卫生问题：`, IssueSuffix: `请尽快处理，谢谢。`).
   - Close the modal.
4. Back on the page, do NOT check anything → both preview boxes show "无问题" templates.
5. Check 卫生间 → tenant preview now shows `prefix\n卫生间话术\nsuffix`. General preview switches to the "有卫生问题/无损坏" version.
6. Add a custom damage entry "厨房水管漏水" → landlord preview shows the prefix + custom entry + suffix. General switches to "有卫生问题/有损坏".
7. Click each "复制" button → check clipboard contents in another text app to verify exact text.

- [ ] **Step 4: Test inspection-type creation**

In ⚙ → 检查类型 tab → add "年中检查" → close modal. Click the new "年中检查" radio button. Re-open the modal → 整体描述 & 包装语 → expand "年中检查": confirm 4 empty General textareas + 2 empty Audience cards exist (auto-created by the backend).

- [ ] **Step 5: Smoke-test deletion cascade**

Add a throwaway inspection type "TestDelete", confirm child rows exist via the UI, then delete it via the trash icon. Confirm it disappears from the radio buttons. (Optional via SQL: confirm GeneralTemplates / AudienceTemplates rows for that id are gone.)

- [ ] **Step 6: Commit nothing — just verify**

If all steps pass, the feature is complete. Otherwise, file the failing step as a follow-up task.

---

## Self-Review Checklist (already run by plan author)

- ✅ Spec coverage: every section in the spec maps to a task above.
- ✅ No placeholders / TBDs.
- ✅ Type names match across tasks (`TemplateInspectionType`, `CleanlinessArea`, `DamageItem`, `GeneralTemplate`, `AudienceTemplate`, `TemplateAudience` enum, `assemble()` signature).
- ✅ File paths exact and consistent throughout.
- ✅ DB SQL is idempotent (every `CREATE` uses `IF NOT EXISTS`, every seed uses `WHERE NOT EXISTS`).
