using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace InspectionApi.Security;

public static class LoginRateLimitPolicy
{
    public const string Name = "login";
    private const string CloudflareClientIpHeader = "CF-Connecting-IP";

    public static RateLimitPartition<string> CreatePartition(HttpContext context) =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetPartitionKey(context),
            factory: _ => CreateOptions());

    public static FixedWindowRateLimiterOptions CreateOptions() => new()
    {
        PermitLimit = 5,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
        AutoReplenishment = true,
    };

    public static string GetPartitionKey(HttpContext context)
    {
        var remoteIp = context.Connection.RemoteIpAddress;

        // The production Cloudflare Tunnel connects to Kestrel from loopback. Trust
        // its client-IP header only on that local hop so public callers cannot spoof it.
        if (remoteIp is not null
            && IPAddress.IsLoopback(remoteIp)
            && context.Request.Headers.TryGetValue(CloudflareClientIpHeader, out var forwardedValue)
            && IPAddress.TryParse(forwardedValue.ToString(), out var forwardedIp))
        {
            return forwardedIp.ToString();
        }

        return remoteIp?.ToString() ?? "unknown";
    }
}
