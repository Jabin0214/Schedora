using System.Net;
using InspectionApi.Security;
using Microsoft.AspNetCore.Http;

namespace Backend.Tests;

public class LoginRateLimitPolicyTests
{
    [Fact]
    public void GetPartitionKey_UsesCloudflareClientIpFromLocalTunnel()
    {
        var context = CreateContext(IPAddress.Loopback, "203.0.113.10");

        Assert.Equal("203.0.113.10", LoginRateLimitPolicy.GetPartitionKey(context));
    }

    [Fact]
    public void GetPartitionKey_KeepsDirectClientIpAndIgnoresSpoofedHeader()
    {
        var context = CreateContext(IPAddress.Parse("198.51.100.20"), "203.0.113.10");

        Assert.Equal("198.51.100.20", LoginRateLimitPolicy.GetPartitionKey(context));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-ip")]
    [InlineData("203.0.113.10, 198.51.100.20")]
    public void GetPartitionKey_RejectsInvalidCloudflareClientIp(string headerValue)
    {
        var context = CreateContext(IPAddress.Loopback, headerValue);

        Assert.Equal("127.0.0.1", LoginRateLimitPolicy.GetPartitionKey(context));
    }

    [Fact]
    public void CreateOptions_EnforcesFiveAttemptsPerMinuteWithoutQueueing()
    {
        var options = LoginRateLimitPolicy.CreateOptions();

        Assert.Equal(5, options.PermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), options.Window);
        Assert.Equal(0, options.QueueLimit);
        Assert.True(options.AutoReplenishment);
    }

    private static DefaultHttpContext CreateContext(IPAddress remoteIp, string cloudflareIp)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = remoteIp;
        context.Request.Headers["CF-Connecting-IP"] = cloudflareIp;
        return context;
    }
}
