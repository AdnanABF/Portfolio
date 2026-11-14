namespace Portfolio.API.Features.Auth;

public interface ISessionManager
{
    /// <summary>Sessions of one user, newest activity first. Ended (revoked or expired) sessions are left out unless asked for.</summary>
    Task<List<UserSessionDto>> GetUserSessionsAsync(Guid userId, Guid? currentSessionId, bool includeEnded = true);
    Task<bool> RevokeSessionAsync(Guid sessionId, Guid? requestingUserId, bool isAdmin);
    /// <summary>Revokes every session of the user, except exceptSessionId when given (the session making the request).</summary>
    Task RevokeAllUserSessionsAsync(Guid userId, Guid? exceptSessionId = null);
}
