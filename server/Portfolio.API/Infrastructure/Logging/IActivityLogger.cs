namespace Portfolio.API.Infrastructure.Logging;

public interface IActivityLogger
{
    Task LogAsync(string action, string entityType, string entityId, string summary, string? detailsJson = null);
}
