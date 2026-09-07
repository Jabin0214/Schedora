using InspectionApi.Data;

namespace Backend.Tests;

public class DatabaseStartupSqlTests
{
    [Fact]
    public void SystemSettingsTableIncludesAiInspectionReportPrompt()
    {
        var sql = DatabaseStartupSql.SystemSettingsTableSql;

        Assert.Contains("\"SystemSettings\"", sql);
        Assert.Contains("AiInspectionReportPrompt", sql);
        Assert.Contains("ON CONFLICT", sql);
    }

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

    [Fact]
    public void PropertiesStartupSqlAddsPropertyConditionColumn()
    {
        Assert.Contains("\"Properties\"", DatabaseStartupSql.PropertiesTableSql);
        Assert.Contains("\"PropertyCondition\" text", DatabaseStartupSql.PropertiesTableSql);
    }

    [Fact]
    public void InspectionTasksStartupSqlRemovesNotesLengthLimit()
    {
        Assert.Contains("\"InspectionTasks\"", DatabaseStartupSql.InspectionTasksTableSql);
        Assert.Contains("\"Notes\" TYPE text", DatabaseStartupSql.InspectionTasksTableSql);
    }

    [Fact]
    public void InspectionRecordsStartupSqlAddsAndBackfillsWorkUnits()
    {
        var sql = DatabaseStartupSql.InspectionRecordsTableSql;

        Assert.Contains("\"InspectionRecords\"", sql);
        Assert.Contains("information_schema.columns", sql);
        Assert.Contains("WHEN \"Type\" IN (0, 1) THEN 2", sql);
        Assert.Contains("ALTER COLUMN \"WorkUnits\" SET NOT NULL", sql);
    }
}
