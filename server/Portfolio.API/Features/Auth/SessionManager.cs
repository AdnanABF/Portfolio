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

    public async Task<List<UserSessionDto>> GetAdminSessionsAsync()
    {
        return await _context.UserSessions
            .AsNoTracking()
            .Include(s => s.User)
            .OrderByDescending(s => s.LastActiveAt)
            .Take(100)
            .Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserEmail = s.User != null ? s.User.Email ?? "" : "",
                LoginMethod = s.LoginMethod,
                DeviceInfo = s.DeviceInfo,
                IpAddress = s.IpAddress,
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt,
                ExpiresAt = s.ExpiresAt,
                IsRevoked = s.IsRevoked,
                IsCurrent = false
            })
            .ToListAsync();
    }

    public async Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, Guid? currentSessionId)
    {
        return await _context.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.LastActiveAt)
            .Select(s => new UserSessionDto
            {
                Id = s.Id,
                UserId = s.UserId,
                UserEmail = "",
                LoginMethod = s.LoginMethod,
                DeviceInfo = s.DeviceInfo,
                IpAddress = s.IpAddress,
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt,
                ExpiresAt = s.ExpiresAt,
                IsRevoked = s.IsRevoked,
                IsCurrent = currentSessionId.HasValue && s.Id == currentSessionId.Value
            })
            .ToListAsync();
    }

    public async Task<bool> RevokeSessionAsync(Guid sessionId, Guid? requestingUserId, bool isAdmin)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session == null) return false;

        if (!isAdmin && requestingUserId.HasValue && session.UserId != requestingUserId.Value)
        {
            return false;
        }

        session.IsRevoked = true;
        session.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task RevokeAllUserSessionsAsync(Guid userId)
    {
        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync();

        foreach (var s in sessions)
        {
            s.IsRevoked = true;
            s.RevokedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
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
