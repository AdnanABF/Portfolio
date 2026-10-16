using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;

namespace Portfolio.API.Features.Admin;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActivityLogDto>> GetActivityLogsAsync(int take = 100, CancellationToken cancellationToken = default)
    {
        return await _context.ActivityLogs
            .AsNoTracking()
            .OrderByDescending(a => a.Timestamp)
            .Take(take)
            .Select(a => new ActivityLogDto
            {
                Id = a.Id,
                UserEmail = a.UserEmail,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Summary = a.Summary,
                DetailsJson = a.DetailsJson,
                IpAddress = a.IpAddress,
                DeviceInfo = a.DeviceInfo,
                Timestamp = a.Timestamp
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<SystemLogDto>> GetSystemLogsAsync(int take = 100, string? level = null, CancellationToken cancellationToken = default)
    {
        var query = _context.SystemLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(level))
        {
            query = query.Where(s => s.Level.ToLower() == level.ToLower());
        }

        return await query
            .OrderByDescending(s => s.Timestamp)
            .Take(take)
            .Select(s => new SystemLogDto
            {
                Id = s.Id,
                Level = s.Level,
                Message = s.Message,
                Exception = s.Exception,
                StackTrace = s.StackTrace,
                Path = s.Path,
                HttpMethod = s.HttpMethod,
                StatusCode = s.StatusCode,
                IpAddress = s.IpAddress,
                Timestamp = s.Timestamp
            })
            .ToListAsync(cancellationToken);
    }
}
