namespace InspectionApi.Security;

public sealed record JwtSettings(string Secret, string Issuer, string Audience, double ExpiryHours)
{
    private const int MinimumSecretLength = 32;
    private const double DefaultExpiryHours = 24;
    private const double MaximumExpiryHours = 720;

    public static JwtSettings Load(IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"] ?? string.Empty;
        if (secret.Length < MinimumSecretLength)
        {
            throw new InvalidOperationException(
                $"JWT Secret must be at least {MinimumSecretLength} characters.");
        }

        var rawExpiry = configuration["Jwt:ExpiryHours"];
        var expiryHours = rawExpiry is null
            ? DefaultExpiryHours
            : double.TryParse(rawExpiry, out var parsed) ? parsed : double.NaN;

        if (!double.IsFinite(expiryHours) || expiryHours <= 0 || expiryHours > MaximumExpiryHours)
        {
            throw new InvalidOperationException(
                $"JWT ExpiryHours must be greater than 0 and no more than {MaximumExpiryHours}.");
        }

        return new JwtSettings(
            secret,
            configuration["Jwt:Issuer"] ?? "Schedora",
            configuration["Jwt:Audience"] ?? "SchedoraApp",
            expiryHours);
    }
}
