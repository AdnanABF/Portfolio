namespace Portfolio.API.Features.Auth;

public interface ISessionManager
{
    Task<List<UserSessionDto>> GetAdminSessionsAsync();
    Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, Guid? currentSessionId);
    Task<bool> RevokeSessionAsync(Guid sessionId, Guid? requestingUserId, bool isAdmin);
    Task RevokeAllUserSessionsAsync(Guid userId);
}
