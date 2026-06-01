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
        Assert.Contains("\"GeneralTemplates\"", sql);
        Assert.DoesNotContain("\"CleanlinessAreas\"", sql);
        Assert.DoesNotContain("\"DamageItems\"", sql);
        Assert.DoesNotContain("\"AudienceTemplates\"", sql);
    }

    [Fact]
    public void TenantContactsStartupSqlCreatesContactTable()
    {
        Assert.Contains("\"TenantContacts\"", DatabaseStartupSql.TenantContactsTableSql);
        Assert.Contains("\"FK_TenantContacts_Properties_PropertyId\"", DatabaseStartupSql.TenantContactsTableSql);
        Assert.Contains("\"IX_TenantContacts_PropertyId\"", DatabaseStartupSql.TenantContactsTableSql);
        Assert.Contains("\"TenantContacts\"", DatabaseStartupSql.IdentitySequenceSyncSql);
    }
}
