using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Auth;

public interface ISessionManager
{
    Task<UserSession> CreateSessionAsync(Guid userId, string token, HttpContext httpContext);
    Task RevokeSessionAsync(Guid sessionId);
    Task<List<UserSessionDto>> GetActiveSessionsAsync();
}
