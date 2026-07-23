using InspectionApi.Models;
using InspectionApi.Services;

namespace Backend.Tests;

public class TenantContactImportServiceTests
{
    [Fact]
    public async Task PreviewImportParsesPalaceCsvAndMatchesNormalizedPropertyAddress()
    {
        var csv = """
            "tenant contact Custom View Report (Tenant)"
            "Property Address Full","Tenant Group Phone 1","Tenant Group Email"
            "4A/11C (*) City Road City Centre (Auckland City)","0204253207","tenant@example.com"
            """;
        var properties = new[]
        {
            new Property { Id = 136, Address = "4A/11C City Road City Centre (Auckland City)" }
        };

        var preview = await TenantContactImportService.PreviewImportAsync(ToStream(csv), properties);

        Assert.Equal(1, preview.TotalRows);
        Assert.Equal(1, preview.MatchedRows);
        Assert.Empty(preview.UnmatchedRows);
        var row = Assert.Single(preview.MatchedContacts);
        Assert.Equal(136, row.PropertyId);
        Assert.Equal("4A/11C (*) City Road City Centre (Auckland City)", row.SourceAddress);
        Assert.Equal("0204253207", row.Phone);
        Assert.Equal("tenant@example.com", row.Email);
    }

    [Fact]
    public async Task PreviewImportDoesNotFuzzyMatchDifferentUnitNumbers()
    {
        var csv = """
            "tenant contact Custom View Report (Tenant)"
            "Property Address Full","Tenant Group Phone 1","Tenant Group Email"
            "1012B/85 Wakefield street City Centre (Auckland City)","0223886833","tenant@example.com"
            """;
        var properties = new[]
        {
            new Property { Id = 87, Address = "1012/85 Wakefield street City Centre (Auckland City)" }
        };

        var preview = await TenantContactImportService.PreviewImportAsync(ToStream(csv), properties);

        Assert.Equal(1, preview.TotalRows);
        Assert.Equal(0, preview.MatchedRows);
        Assert.Empty(preview.MatchedContacts);
        var row = Assert.Single(preview.UnmatchedRows);
        Assert.Equal("1012B/85 Wakefield street City Centre (Auckland City)", row.SourceAddress);
    }

    [Fact]
    public async Task PreviewImportSkipsRowsWithoutAnyContactDetails()
    {
        var csv = """
            "tenant contact Custom View Report (Tenant)"
            "Property Address Full","Tenant Group Phone 1","Tenant Group Email"
            "0 Unallocated Albany","",""
            """;
        var properties = new[]
        {
            new Property { Id = 1, Address = "0 Unallocated Albany" }
        };

        var preview = await TenantContactImportService.PreviewImportAsync(ToStream(csv), properties);

        Assert.Equal(1, preview.TotalRows);
        Assert.Equal(0, preview.MatchedRows);
        Assert.Empty(preview.MatchedContacts);
        Assert.Empty(preview.UnmatchedRows);
        Assert.Equal(1, preview.SkippedRows);
    }

    [Fact]
    public async Task PreviewImportReadsTenantEmailAndLeaseEndFromNewPalaceExport()
    {
        var csv = """
            "tenant contact Custom View Report (Tenant)"
            "Property Address Full","Tenant Group Phone 1","Tenant Email 1","Tenant Group Lease Date Ended"
            "1001/147 Victoria street west City Centre (Auckland City)","","tenant@example.com","24/02/2027"
            """;
        var properties = new[]
        {
            new Property { Id = 147, Address = "1001/147 Victoria street west City Centre (Auckland City)" }
        };

        var preview = await TenantContactImportService.PreviewImportAsync(ToStream(csv), properties);

        var row = Assert.Single(preview.MatchedContacts);
        Assert.Equal("tenant@example.com", row.Email);
        Assert.Equal("24/02/2027", row.LeaseDateEnded);
    }

    [Fact]
    public async Task PreviewImportDeduplicatesRepeatedContactRowsForSameProperty()
    {
        var csv = """
            "tenant contact Custom View Report (Tenant)"
            "Property Address Full","Tenant Group Phone 1","Tenant Email 1","Tenant Group Lease Date Ended"
            "10 Cotesmore way Parnell","0210 867 4408","tenant@example.com",""
            "10 Cotesmore way Parnell","0210 867 4408","tenant@example.com",""
            """;
        var properties = new[]
        {
            new Property { Id = 62, Address = "10 Cotesmore way Parnell" }
        };

        var preview = await TenantContactImportService.PreviewImportAsync(ToStream(csv), properties);

        Assert.Equal(2, preview.TotalRows);
        Assert.Equal(1, preview.MatchedRows);
        Assert.Single(preview.MatchedContacts);
    }

    [Fact]
    public void BuildSummaryCountsExistingRowsThatWillBeReplacedAndNewRows()
    {
        var preview = new TenantContactImportPreview
        {
            TotalRows = 3,
            MatchedRows = 2,
            SkippedRows = 1,
            MatchedContacts =
            {
                new TenantContactImportMatch
                {
                    PropertyId = 10,
                    PropertyAddress = "10 Example Street",
                    SourceAddress = "10 Example Street",
                    Phone = "021111111",
                    Email = "same@example.com"
                },
                new TenantContactImportMatch
                {
                    PropertyId = 10,
                    PropertyAddress = "10 Example Street",
                    SourceAddress = "10 Example Street",
                    Phone = "022222222",
                    Email = "new@example.com"
                }
            }
        };
        var existing = new[]
        {
            new TenantContact
            {
                PropertyId = 10,
                SourceAddress = "10 Example Street",
                Phone = "021111111",
                Email = "same@example.com"
            },
            new TenantContact
            {
                PropertyId = 10,
                SourceAddress = "10 Example Street",
                Phone = "029999999",
                Email = "old@example.com"
            }
        };

        var summary = TenantContactImportService.BuildSummary(preview, existing);

        Assert.Equal(1, summary.MatchedProperties);
        Assert.Equal(2, summary.ExistingRowsToReplace);
        Assert.Equal(1, summary.UnchangedRows);
        Assert.Equal(1, summary.NewOrChangedRows);
    }

    private static Stream ToStream(string text)
    {
        return new MemoryStream(System.Text.Encoding.UTF8.GetBytes(text.Replace("\r\n", "\n")));
    }
}
