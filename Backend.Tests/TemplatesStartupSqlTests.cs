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

    [Fact]
    public void UpgradesLegacyGeneralTemplatesWithIssueColumnsBeforeCreatingTheIndex()
    {
        var sql = TemplatesStartupSql.Sql;
        var cleanlinessColumn = "ADD COLUMN IF NOT EXISTS \"HasCleanlinessIssue\" boolean NOT NULL DEFAULT false";
        var damageColumn = "ADD COLUMN IF NOT EXISTS \"HasDamageIssue\" boolean NOT NULL DEFAULT false";
        var index = "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_GeneralTemplates_Combo\"";

        Assert.Contains(cleanlinessColumn, sql);
        Assert.Contains(damageColumn, sql);
        Assert.True(sql.IndexOf(cleanlinessColumn) < sql.IndexOf(index));
        Assert.True(sql.IndexOf(damageColumn) < sql.IndexOf(index));
    }

    [Fact]
    public void RemovesTheLegacySingleTemplateIndexBeforeSeedingIssueVariants()
    {
        var sql = TemplatesStartupSql.Sql;
        var legacyIndex = "DROP INDEX IF EXISTS \"IX_GeneralTemplates_InspectionTypeId\"";
        var seedBlock = "-- Seed General + Audience rows";

        Assert.Contains(legacyIndex, sql);
        Assert.True(sql.IndexOf(legacyIndex) < sql.IndexOf(seedBlock));
    }
}
