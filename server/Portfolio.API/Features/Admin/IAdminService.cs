namespace Portfolio.API.Features.Admin;

public interface IAdminService
{
    Task<ActivityLogPage> GetActivityLogsAsync(ActivityLogQuery query, CancellationToken cancellationToken = default);
    Task<SystemLogPage> GetSystemLogsAsync(SystemLogQuery query, CancellationToken cancellationToken = default);
}
