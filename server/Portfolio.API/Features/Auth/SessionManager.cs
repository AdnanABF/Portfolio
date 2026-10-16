using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using UAParser;

namespace Portfolio.API.Features.Auth;

public class SessionManager : ISessionManager
{
    private readonly AppDbContext _context;

    public SessionManager(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserSession> CreateSessionAsync(Guid userId, string token, HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userAgent = httpContext.Request.Headers["User-Agent"].ToString() ?? "";
        var deviceInfo = ParseDeviceInfo(userAgent);

        var session = new UserSession
        {
            UserId = userId,
            SessionToken = token,
            IpAddress = ip,
            UserAgent = userAgent.Length > 500 ? userAgent[..500] : userAgent,
            DeviceInfo = deviceInfo,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            IsRevoked = false
        };

        await _context.UserSessions.AddAsync(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task RevokeSessionAsync(Guid sessionId)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<UserSessionDto>> GetActiveSessionsAsync()
    {
        return await _context.UserSessions
            .AsNoTracking()
            .OrderByDescending(s => s.LastActiveAt)
            .Take(50)
            .Select(s => new UserSessionDto
            {
                Id = s.Id,
                DeviceInfo = s.DeviceInfo,
                IpAddress = s.IpAddress,
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt,
                IsRevoked = s.IsRevoked
            })
            .ToListAsync();
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
