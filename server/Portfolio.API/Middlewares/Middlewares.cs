using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Data;
using Portfolio.API.Data.Entities;

namespace Portfolio.API.Middlewares;

public class SessionTrackingMiddleware
{
    private readonly RequestDelegate _next;

    public SessionTrackingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (context.Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var tokenStr = authHeader.ToString();
            if (tokenStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = tokenStr["Bearer ".Length..].Trim();
                var session = await dbContext.UserSessions.FirstOrDefaultAsync(s => s.SessionToken == token);

                if (session != null)
                {
                    if (session.IsRevoked)
                    {
                        context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync("{\"error\": \"Session has been revoked.\"}");
                        return;
                    }

                    // Update last active if > 60 seconds since last recorded
                    if ((DateTime.UtcNow - session.LastActiveAt).TotalSeconds > 60)
                    {
                        session.LastActiveAt = DateTime.UtcNow;
                        await dbContext.SaveChangesAsync();
                    }
                }
            }
        }

        await _next(context);
    }
}

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred at {Path}", context.Request.Path);
            await LogToDatabaseAsync(context, ex, serviceProvider);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task LogToDatabaseAsync(HttpContext context, Exception ex, IServiceProvider serviceProvider)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var log = new SystemLog
            {
                Level = "Error",
                Message = ex.Message,
                Exception = ex.GetType().FullName,
                StackTrace = ex.StackTrace,
                Path = context.Request.Path,
                HttpMethod = context.Request.Method,
                StatusCode = (int)HttpStatusCode.InternalServerError,
                IpAddress = ip,
                Timestamp = DateTime.UtcNow
            };

            await dbContext.SystemLogs.AddAsync(log);
            await dbContext.SaveChangesAsync();
        }
        catch
        {
            // Fail silently to prevent recursive crash
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new
        {
            error = "An internal server error occurred.",
            message = ex.Message
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
