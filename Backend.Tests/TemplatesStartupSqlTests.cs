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
