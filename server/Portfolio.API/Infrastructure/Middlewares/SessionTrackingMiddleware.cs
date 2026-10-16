using System.Net;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;

namespace Portfolio.API.Infrastructure.Middlewares;

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
