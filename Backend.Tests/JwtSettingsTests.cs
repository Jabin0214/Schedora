using InspectionApi.Security;
using Microsoft.Extensions.Configuration;

namespace Backend.Tests;

public class JwtSettingsTests
{
    private static IConfiguration Configuration(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.ToDictionary(item => item.Key, item => item.Value))
            .Build();

    [Fact]
    public void Load_RejectsShortSigningSecret()
    {
        var configuration = Configuration(("Jwt:Secret", "too-short"));

        var error = Assert.Throws<InvalidOperationException>(() => JwtSettings.Load(configuration));

        Assert.Contains("at least 32 characters", error.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("721")]
    [InlineData("not-a-number")]
    public void Load_RejectsExpiryOutsideOperationalRange(string expiry)
    {
        var configuration = Configuration(
            ("Jwt:Secret", new string('s', 32)),
            ("Jwt:ExpiryHours", expiry));

        Assert.Throws<InvalidOperationException>(() => JwtSettings.Load(configuration));
    }

    [Fact]
    public void Load_UsesExpectedDefaults()
    {
        var configuration = Configuration(("Jwt:Secret", new string('s', 32)));

        var settings = JwtSettings.Load(configuration);

        Assert.Equal("Schedora", settings.Issuer);
        Assert.Equal("SchedoraApp", settings.Audience);
        Assert.Equal(24, settings.ExpiryHours);
    }

    [Fact]
    public void Load_PreservesValidExplicitValues()
    {
        var configuration = Configuration(
            ("Jwt:Secret", new string('s', 32)),
            ("Jwt:Issuer", "CustomIssuer"),
            ("Jwt:Audience", "CustomAudience"),
            ("Jwt:ExpiryHours", "168"));

        var settings = JwtSettings.Load(configuration);

        Assert.Equal("CustomIssuer", settings.Issuer);
        Assert.Equal("CustomAudience", settings.Audience);
        Assert.Equal(168, settings.ExpiryHours);
    }
}
