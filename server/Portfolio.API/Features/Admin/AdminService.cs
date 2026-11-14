using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Infrastructure.Querying;

namespace Portfolio.API.Features.Admin;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ActivityLogPage> GetActivityLogsAsync(ActivityLogQuery query, CancellationToken cancellationToken = default)
    {
        var logs = _context.ActivityLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim();
            logs = logs.Where(a => a.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(query.EntityType))
        {
            var entityType = query.EntityType.Trim();
            logs = logs.Where(a => a.EntityType == entityType);
        }

        if (query.From.HasValue)
        {
            var from = query.From.Value.UtcDateTime;
            logs = logs.Where(a => a.Timestamp >= from);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value.UtcDateTime;
            logs = logs.Where(a => a.Timestamp < to);
        }

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = $"%{LikeEscaper.Escape(search)}%";
            logs = logs.Where(a =>
                EF.Functions.ILike(a.Action, pattern) ||
                EF.Functions.ILike(a.Summary, pattern) ||
                EF.Functions.ILike(a.UserEmail, pattern) ||
                EF.Functions.ILike(a.EntityType, pattern));
        }

        var totalCount = await logs.CountAsync(cancellationToken);

        var items = await logs
            .OrderByDescending(a => a.Timestamp)
            .ThenByDescending(a => a.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
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

        // The filter dropdown lists come from the whole table (not the filtered rows). Fine at this size; if the
        // log grows large, cache these or index Action and EntityType.
        var actions = await _context.ActivityLogs.AsNoTracking()
            .Select(a => a.Action).Distinct().OrderBy(a => a).ToListAsync(cancellationToken);
        var entityTypes = await _context.ActivityLogs.AsNoTracking()
            .Select(a => a.EntityType).Distinct().OrderBy(e => e).ToListAsync(cancellationToken);

        return new ActivityLogPage
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            Actions = actions,
            EntityTypes = entityTypes
        };
    }

    public async Task<SystemLogPage> GetSystemLogsAsync(SystemLogQuery query, CancellationToken cancellationToken = default)
    {
        var logs = _context.SystemLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Level))
        {
            var level = query.Level.Trim().ToLower();
            logs = logs.Where(s => s.Level.ToLower() == level);
        }

        if (query.From.HasValue)
        {
            var from = query.From.Value.UtcDateTime;
            logs = logs.Where(s => s.Timestamp >= from);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value.UtcDateTime;
            logs = logs.Where(s => s.Timestamp < to);
        }

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = $"%{LikeEscaper.Escape(search)}%";
            // A leading % cannot use an index, so searching the exception text scans the table. Fine at this size.
            logs = logs.Where(s =>
                EF.Functions.ILike(s.Message, pattern) ||
                (s.Path != null && EF.Functions.ILike(s.Path, pattern)) ||
                (s.Exception != null && EF.Functions.ILike(s.Exception, pattern)));
        }

        var totalCount = await logs.CountAsync(cancellationToken);

        var items = await logs
            .OrderByDescending(s => s.Timestamp)
            .ThenByDescending(s => s.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
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

        // Per-level totals for the whole log (they ignore the filters), shown next to the level filter.
        var levelCounts = await _context.SystemLogs.AsNoTracking()
            .GroupBy(s => s.Level.ToLower())
            .Select(g => new { Level = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int CountFor(string level) => levelCounts.FirstOrDefault(c => c.Level == level)?.Count ?? 0;

        return new SystemLogPage
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            ErrorCount = CountFor("error"),
            WarningCount = CountFor("warning"),
            InformationCount = CountFor("information")
        };
    }
}
