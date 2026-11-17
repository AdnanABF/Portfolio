namespace Portfolio.API.Infrastructure.Logging;

public interface IActivityLogger
{
    /// <summary>
    /// Writes one audit entry. The actor is the signed-in user; for something done by a visitor who is not signed in
    /// (a contact message, a failed sign-in, a CV download) pass <paramref name="actor"/> to say who, instead of "system".
    /// </summary>
    Task LogAsync(string action, string entityType, string entityId, string summary, string? detailsJson = null, string? actor = null);
}
