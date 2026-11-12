using System.Net;
using Microsoft.AspNetCore.Http;

namespace Portfolio.API.Infrastructure.Extensions;

public static class HttpContextExtensions
{
    /// <summary>
    /// Returns the client IP address used for rate limiting and audit logs.
    /// Forwarded headers are NOT read here. UseForwardedHeaders() rewrites
    /// Connection.RemoteIpAddress, but only when the request comes from a proxy
    /// listed in ForwardedHeaders:KnownNetworks / KnownProxies. Raw
    /// X-Forwarded-For values from anyone else are ignored, so a client
    /// cannot pick its own IP to get a fresh rate-limit bucket.
    /// </summary>
    public static string GetClientIpAddress(this HttpContext? httpContext)
    {
        var remoteIp = httpContext?.Connection?.RemoteIpAddress;
        return remoteIp != null ? remoteIp.ToString() : "unknown";
    }
}
