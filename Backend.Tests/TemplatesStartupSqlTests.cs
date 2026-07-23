using InspectionApi.Data;

namespace Backend.Tests;

public class TemplatesStartupSqlTests
{
    [Fact]
    public void CreatesOnlyInspectionTypeAndGeneralTemplateTables()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("\"TemplateInspectionTypes\"", sql);
        Assert.Contains("\"GeneralTemplates\"", sql);
        Assert.DoesNotContain("CREATE TABLE IF NOT EXISTS \"CleanlinessAreas\"", sql);
        Assert.DoesNotContain("CREATE TABLE IF NOT EXISTS \"DamageItems\"", sql);
        Assert.DoesNotContain("CREATE TABLE IF NOT EXISTS \"AudienceTemplates\"", sql);
    }

    [Fact]
    public void UsesIfNotExistsForIdempotency()
    {
        // All CREATE TABLE statements must be IF NOT EXISTS so startup is safe to re-run.
        var sql = TemplatesStartupSql.Sql;
        var createCount = System.Text.RegularExpressions.Regex
            .Matches(sql, "CREATE TABLE IF NOT EXISTS").Count;
        Assert.Equal(2, createCount);
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
    public void DropsRemovedDetailTables()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("DROP TABLE IF EXISTS \"AudienceTemplates\"", sql);
        Assert.Contains("DROP TABLE IF EXISTS \"CleanlinessAreas\"", sql);
        Assert.Contains("DROP TABLE IF EXISTS \"DamageItems\"", sql);
    }

    [Fact]
    public void GeneralTemplatesAreOnePerInspectionType()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("\"IX_GeneralTemplates_InspectionTypeId\"", sql);
        Assert.DoesNotContain("\"HasCleanlinessIssue\"  boolean", sql);
        Assert.DoesNotContain("\"HasDamageIssue\"       boolean", sql);
    }

    [Fact]
    public void CollapsePreservesExistingNonEmptyGeneralText()
    {
        var sql = TemplatesStartupSql.Sql;
        Assert.Contains("first_non_empty", sql);
        Assert.Contains("NULLIF(trim(src.\"Text\"), '')", sql);
        Assert.Contains("SET \"Text\" = COALESCE(first_non_empty.\"Text\", keeper.\"Text\")", sql);
    }
}
