using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;
using UAParser;

namespace Portfolio.API.Features.Auth;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ISessionManager _sessionManager;
    private readonly IActivityLogger _activityLogger;

    public AuthService(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ISessionManager sessionManager,
        IActivityLogger activityLogger)
    {
        _context = context;
        _userManager = userManager;
        _signInManager = signInManager;
        _sessionManager = sessionManager;
        _activityLogger = activityLogger;
    }

    public async Task CompleteLoginAsync(ApplicationUser user, string loginMethod, HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        // 1. Delete sessions expired or revoked for more than 30 days
        var cutoff = DateTime.UtcNow.AddDays(-30);
        await _context.UserSessions
            .Where(s => (s.IsRevoked && s.RevokedAt < cutoff) || s.ExpiresAt < cutoff)
            .ExecuteDeleteAsync(cancellationToken);

        // 2. Resolve client info
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();
        var deviceInfo = ParseDeviceInfo(userAgent);

        // 3. Create session row
        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            LoginMethod = loginMethod,
            IpAddress = ip,
            UserAgent = userAgent.Length > 500 ? userAgent[..500] : userAgent,
            DeviceInfo = deviceInfo,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(14),
            IsRevoked = false
        };

        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        // 4. Update user's last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // 5. Sign in with application cookie + sid claim
        var claims = new[] { new Claim("sid", session.Id.ToString()) };
        await _signInManager.SignInWithClaimsAsync(user, isPersistent: true, claims);

        await _activityLogger.LogAsync("USER_LOGIN", "User", user.Id.ToString(), $"User {user.Email} logged in via {loginMethod}.");
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return null;

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded) return null;

        await CompleteLoginAsync(user, "Password", httpContext, cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);

        return new LoginResponse
        {
            Token = string.Empty,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = roles.FirstOrDefault() ?? user.Role,
            ExpiresAt = DateTime.UtcNow.AddDays(14)
        };
    }

    public async Task LogoutAsync(HttpContext httpContext)
    {
        var sidClaim = httpContext.User.FindFirst("sid")?.Value;
        if (Guid.TryParse(sidClaim, out var sessionId))
        {
            var session = await _context.UserSessions.FindAsync(sessionId);
            if (session != null)
            {
                session.IsRevoked = true;
                session.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
        await _activityLogger.LogAsync("USER_LOGOUT", "User", userId, "User logged out.");
        await _signInManager.SignOutAsync();
    }

    public async Task SignOutEverywhereAsync(ApplicationUser user, HttpContext httpContext)
    {
        await _sessionManager.RevokeAllUserSessionsAsync(user.Id);
        await _userManager.UpdateSecurityStampAsync(user);
        await _signInManager.SignOutAsync();
        await _activityLogger.LogAsync("USER_LOGOUT_ALL", "User", user.Id.ToString(), "User signed out from all sessions.");
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;

        var roles = await _userManager.GetRolesAsync(user);
        var isAdmin = roles.Contains("SuperAdmin") || roles.Contains("Admin");

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = roles.FirstOrDefault() ?? user.Role,
            Roles = roles,
            IsAdmin = isAdmin,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    private static string ParseDeviceInfo(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown Device";
        try
        {
            var parser = Parser.GetDefault();
            var clientInfo = parser.Parse(userAgent);
            return $"{clientInfo.UA.Family} {clientInfo.UA.Major} on {clientInfo.OS.Family}";
        }
        catch
        {
            return "Web Browser";
        }
    }
}
