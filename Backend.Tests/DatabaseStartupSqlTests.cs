using InspectionApi.Data;

namespace Backend.Tests;

public class DatabaseStartupSqlTests
{
    [Fact]
    public void IdentitySequenceSyncIncludesProperties()
    {
        Assert.Contains("\"Properties\"", DatabaseStartupSql.IdentitySequenceSyncSql);
    }
}
