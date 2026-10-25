using System.Net;
using Microsoft.AspNetCore.Http;

namespace Portfolio.API.Infrastructure.Extensions;

public static class HttpContextExtensions
{
    /// <summary>
    /// Resolves the actual client IP address, taking into account reverse proxies (e.g. Traefik in Coolify, Docker networks)
    /// and standard proxy forwarding headers (X-Forwarded-For, X-Real-IP).
    /// </summary>
    public static string GetClientIpAddress(this HttpContext? httpContext)
    {
        if (httpContext == null)
        {
            return "unknown";
        }

        // 1. Prefer X-Forwarded-For header if present (first entry is the client IP)
        if (httpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            var rawIp = forwardedFor.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (rawIp.Length > 0 && IPAddress.TryParse(rawIp[0], out var parsedIp))
            {
                return parsedIp.ToString();
            }
        }

        // 2. Check X-Real-IP header as fallback
        if (httpContext.Request.Headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
        {
            var trimmed = realIp.ToString().Trim();
            if (IPAddress.TryParse(trimmed, out var parsedIp))
            {
                return parsedIp.ToString();
            }
        }

        // 3. Fall back to Connection.RemoteIpAddress (populated by ASP.NET Core ForwardedHeaders middleware or direct socket)
        var remoteIp = httpContext.Connection?.RemoteIpAddress?.ToString();
        if (!string.IsNullOrWhiteSpace(remoteIp))
        {
            return remoteIp;
        }

        return "unknown";
    }
}
