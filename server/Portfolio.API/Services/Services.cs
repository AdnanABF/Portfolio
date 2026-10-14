using System.Security.Claims;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Data;
using Portfolio.API.Data.Entities;
using Portfolio.API.DTOs;
using UAParser;

namespace Portfolio.API.Services;

// --- Storage Service ---

public interface IStorageService
{
    PresignedUrlResponse GeneratePresignedUploadUrl(PresignedUrlRequest request);
}

public class CloudflareR2StorageService : IStorageService
{
    private readonly IConfiguration _config;
    private readonly ILogger<CloudflareR2StorageService> _logger;

    public CloudflareR2StorageService(IConfiguration config, ILogger<CloudflareR2StorageService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public PresignedUrlResponse GeneratePresignedUploadUrl(PresignedUrlRequest request)
    {
        var accountId = _config["R2:AccountId"] ?? _config["Storage:AccountId"] ?? "";
        var accessKeyId = _config["R2:AccessKeyId"] ?? _config["Storage:AccessKeyId"] ?? "";
        var secretAccessKey = _config["R2:SecretAccessKey"] ?? _config["Storage:SecretAccessKey"] ?? "";
        var bucketName = _config["R2:BucketName"] ?? _config["Storage:BucketName"] ?? "portfolio-media";
        var publicBaseUrl = _config["R2:PublicUrl"] ?? _config["Storage:PublicDomain"] ?? "https://media.adnanbinfarook.com";

        // Generate sanitized unique key e.g. "projects/1728900000-screenshot.webp"
        var ext = Path.GetExtension(request.FileName);
        var baseName = Path.GetFileNameWithoutExtension(request.FileName)
            .Replace(" ", "-")
            .ToLowerInvariant();
        var key = $"{request.Folder}/{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{baseName}{ext}";

        if (string.IsNullOrEmpty(accessKeyId) || string.IsNullOrEmpty(secretAccessKey) || string.IsNullOrEmpty(accountId))
        {
            _logger.LogWarning("Cloudflare R2 credentials not fully configured; generating placeholder upload response.");
            return new PresignedUrlResponse
            {
                UploadUrl = $"/api/media/placeholder-upload?key={key}",
                PublicUrl = $"{publicBaseUrl}/{key}",
                Key = key
            };
        }

        var s3ClientConfig = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com"
        };

        using var client = new AmazonS3Client(accessKeyId, secretAccessKey, s3ClientConfig);

        var presignRequest = new GetPreSignedUrlRequest
        {
            BucketName = bucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(15),
            ContentType = request.ContentType
        };

        var uploadUrl = client.GetPreSignedURL(presignRequest);
        var publicUrl = $"{publicBaseUrl.TrimEnd('/')}/{key}";

        return new PresignedUrlResponse
        {
            UploadUrl = uploadUrl,
            PublicUrl = publicUrl,
            Key = key
        };
    }
}

// --- Activity Logger ---

public interface IActivityLogger
{
    Task LogAsync(string action, string entityType, string entityId, string summary, string? detailsJson = null);
}

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

// --- Session Manager ---

public interface ISessionManager
{
    Task<UserSession> CreateSessionAsync(Guid userId, string token, HttpContext httpContext);
    Task RevokeSessionAsync(Guid sessionId);
    Task<List<UserSessionDto>> GetActiveSessionsAsync();
}

public class SessionManager : ISessionManager
{
    private readonly AppDbContext _context;

    public SessionManager(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserSession> CreateSessionAsync(Guid userId, string token, HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userAgent = httpContext.Request.Headers["User-Agent"].ToString() ?? "";
        var deviceInfo = ParseDeviceInfo(userAgent);

        var session = new UserSession
        {
            UserId = userId,
            SessionToken = token,
            IpAddress = ip,
            UserAgent = userAgent.Length > 500 ? userAgent[..500] : userAgent,
            DeviceInfo = deviceInfo,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow,
            IsRevoked = false
        };

        await _context.UserSessions.AddAsync(session);
        await _context.SaveChangesAsync();
        return session;
    }

    public async Task RevokeSessionAsync(Guid sessionId)
    {
        var session = await _context.UserSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<UserSessionDto>> GetActiveSessionsAsync()
    {
        return await _context.UserSessions
            .OrderByDescending(s => s.LastActiveAt)
            .Take(50)
            .Select(s => new UserSessionDto
            {
                Id = s.Id,
                DeviceInfo = s.DeviceInfo,
                IpAddress = s.IpAddress,
                CreatedAt = s.CreatedAt,
                LastActiveAt = s.LastActiveAt,
                IsRevoked = s.IsRevoked
            })
            .ToListAsync();
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
