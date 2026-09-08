using InspectionApi.Models;
using InspectionApi.Services;

namespace Backend.Tests;

public class TenantContactSummaryFormatterTests
{
    [Fact]
    public void FormatsPhoneAndEmailTogetherForFirstTenantContact()
    {
        var contacts = new[]
        {
            new TenantContact
            {
                Phone = "0204253207",
                Email = "tenant@example.com"
            }
        };

        var summary = TenantContactSummaryFormatter.FormatFirst(contacts);

        Assert.Equal("0204253207 · tenant@example.com", summary);
    }
}
