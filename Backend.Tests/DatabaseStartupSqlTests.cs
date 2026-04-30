using InspectionApi.Data;

namespace Backend.Tests;

public class DatabaseStartupSqlTests
{
    [Fact]
    public void IdentitySequenceSyncIncludesProperties()
    {
        Assert.Contains("\"Properties\"", DatabaseStartupSql.IdentitySequenceSyncSql);
    }

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
}
