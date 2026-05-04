using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace InspectionApi.Controllers;

public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, DateTime ExpiresAt);
public record VerifyResponse(bool Valid, string? Username, DateTime? ExpiresAt);

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IConfiguration configuration, ILogger<AuthController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Login — validates credentials and returns a JWT token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var expectedUsername = _configuration["Auth:Credentials:Username"] ?? "admin";
        var expectedPassword = _configuration["Auth:Credentials:Password"] ?? "";

        if (string.IsNullOrEmpty(expectedPassword))
        {
            _logger.LogError("Auth password is not configured in appsettings");
            return StatusCode(500, new { message = "认证未配置，请联系管理员" });
        }

        if (request.Username != expectedUsername || request.Password != expectedPassword)
        {
            _logger.LogWarning("Failed login attempt for user '{Username}'", request.Username);
            return Unauthorized(new { message = "用户名或密码错误" });
        }

        var token = GenerateJwtToken(request.Username);
        _logger.LogInformation("User '{Username}' logged in successfully", request.Username);
        return Ok(token);
    }

    /// <summary>
    /// Verify — check if the current token is valid (used by frontend to restore sessions).
    /// </summary>
    [HttpGet("verify")]
    [Authorize]
    public IActionResult Verify()
    {
        var username = User.Identity?.Name;
        var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

        DateTime? expiresAt = null;
        if (long.TryParse(expClaim, out var unixSeconds))
            expiresAt = DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime;

        return Ok(new VerifyResponse(true, username, expiresAt));
    }

    private LoginResponse GenerateJwtToken(string username)
    {
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT Secret is not configured");
        var issuer = _configuration["Jwt:Issuer"] ?? "Schedora";
        var audience = _configuration["Jwt:Audience"] ?? "SchedoraApp";
        var expiryHours = double.TryParse(_configuration["Jwt:ExpiryHours"], out var h) ? h : 168;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, username),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new LoginResponse(
            Token: new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt: expiresAt
        );
    }
}
