using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ISessionManager _sessionManager;
    private readonly IActivityLogger _activityLogger;
    private readonly IConfiguration _config;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ISessionManager sessionManager,
        IActivityLogger activityLogger,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _sessionManager = sessionManager;
        _activityLogger = activityLogger;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return null;

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded) return null;

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtSecret = _config["Jwt:Secret"] ?? "PortfolioSuperSecretKeyThatIsAtLeast32BytesLong!";
        var key = Encoding.UTF8.GetBytes(jwtSecret);
        var expires = DateTime.UtcNow.AddDays(7);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = expires,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        await _sessionManager.CreateSessionAsync(user.Id, tokenString, httpContext);

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        await _activityLogger.LogAsync("USER_LOGIN", "User", user.Id.ToString(), $"User {user.Email} logged in.");

        return new LoginResponse
        {
            Token = tokenString,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = user.Role,
            ExpiresAt = expires
        };
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }
}
