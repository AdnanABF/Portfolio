namespace Portfolio.API.Features.Admin;

public interface IAdminService
{
    Task<List<ActivityLogDto>> GetActivityLogsAsync(int take = 100, CancellationToken cancellationToken = default);
    Task<List<SystemLogDto>> GetSystemLogsAsync(int take = 100, string? level = null, CancellationToken cancellationToken = default);
}
