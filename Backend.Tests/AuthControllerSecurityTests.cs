using System.Reflection;
using InspectionApi.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Tests;

public class AuthControllerSecurityTests
{
    [Fact]
    public void Login_IsAnonymousAndUsesLoginRateLimitPolicy()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Login))!;

        Assert.NotNull(method.GetCustomAttribute<AllowAnonymousAttribute>());
        var rateLimit = method.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(rateLimit);
        Assert.Equal("login", rateLimit.PolicyName);
    }
}
