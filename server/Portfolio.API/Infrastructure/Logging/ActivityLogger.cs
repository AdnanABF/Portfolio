using System.Security.Claims;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Extensions;
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

    public async Task LogAsync(string action, string entityType, string entityId, string summary, string? detailsJson = null, string? actor = null)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var userIdStr = httpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = Guid.TryParse(userIdStr, out var u) ? u : null;
            var userEmail = httpContext?.User?.FindFirstValue(ClaimTypes.Email) ?? actor ?? "system";

            var ip = httpContext.GetClientIpAddress();
            var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString() ?? "";
            var deviceInfo = ParseDeviceInfo(userAgent);

            var entry = new ActivityLog
            {
                UserId = userId,
                UserEmail = Cut(userEmail, 100),
                Action = Cut(action, 50),
                EntityType = Cut(entityType, 100),
                EntityId = Cut(entityId, 100),
                Summary = Cut(summary, 500),
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

    /// <summary>Keeps a value inside its column: a too long one would make the whole entry fail to save.</summary>
    private static string Cut(string value, int max) => value.Length <= max ? value : value[..max];

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
