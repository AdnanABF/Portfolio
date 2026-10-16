using System.Security.Claims;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using UAParser;

namespace Portfolio.API.Infrastructure.Logging;

public class ActivityLogger : IActivityLogger
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ActivityLogger> _logger;

    public ActivityLogger(AppDbContext context, IHttpContextAccessor httpContextAccessor, ILogger<ActivityLogger> logger)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task LogAsync(string action, string entityType, string entityId, string summary, string? detailsJson = null)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var userIdStr = httpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = Guid.TryParse(userIdStr, out var u) ? u : null;
            var userEmail = httpContext?.User?.FindFirstValue(ClaimTypes.Email) ?? "system";

            var ip = httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString() ?? "";
            var deviceInfo = ParseDeviceInfo(userAgent);

            var entry = new ActivityLog
            {
                UserId = userId,
                UserEmail = userEmail,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Summary = summary,
                DetailsJson = detailsJson,
                IpAddress = ip,
                DeviceInfo = deviceInfo,
                Timestamp = DateTime.UtcNow
            };

            await _context.ActivityLogs.AddAsync(entry);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record activity audit log");
        }
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
