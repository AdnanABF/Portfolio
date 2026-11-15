using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Core.Data;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static readonly (HttpMethod Method, string Route)[] AdminEndpoints =
    [
        (HttpMethod.Get, "/api/admin/users"),
        (HttpMethod.Post, "/api/admin/users"),
        (HttpMethod.Get, "/api/admin/users/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Put, "/api/admin/users/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Delete, "/api/admin/users/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/activate"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/deactivate"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/restore"),
        (HttpMethod.Delete, "/api/admin/users/00000000-0000-0000-0000-000000000001/erase"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/resend-invite"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/reset-password"),
        (HttpMethod.Get, "/api/admin/users/00000000-0000-0000-0000-000000000001/sessions"),
        (HttpMethod.Delete, "/api/admin/users/00000000-0000-0000-0000-000000000001/sessions/00000000-0000-0000-0000-000000000002"),
        (HttpMethod.Post, "/api/admin/users/00000000-0000-0000-0000-000000000001/sessions/revoke-all"),
        (HttpMethod.Get, "/api/admin/users/00000000-0000-0000-0000-000000000001/activity"),
        (HttpMethod.Get, "/api/admin/site-content"),
        (HttpMethod.Put, "/api/admin/site-content"),
        (HttpMethod.Post, "/api/admin/site-content/publish"),
        (HttpMethod.Post, "/api/admin/site-content/discard"),
        (HttpMethod.Put, "/api/skills/order"),
        (HttpMethod.Put, "/api/experience/order"),
        (HttpMethod.Post, "/api/education"),
        (HttpMethod.Put, "/api/education/order"),
        (HttpMethod.Post, "/api/certifications"),
        (HttpMethod.Put, "/api/certifications/order"),
        (HttpMethod.Get, "/api/admin/activity"),
        (HttpMethod.Get, "/api/admin/system-logs"),
        (HttpMethod.Get, "/api/contact/inquiries"),
        (HttpMethod.Put, "/api/contact/inquiries/00000000-0000-0000-0000-000000000001/status"),
        (HttpMethod.Post, "/api/contact/inquiries/bulk-status"),
        (HttpMethod.Post, "/api/projects"),
        (HttpMethod.Put, "/api/projects/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Delete, "/api/projects/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Post, "/api/experience"),
        (HttpMethod.Put, "/api/experience/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Delete, "/api/experience/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Post, "/api/skills"),
        (HttpMethod.Put, "/api/skills/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Delete, "/api/skills/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Post, "/api/blog"),
        (HttpMethod.Put, "/api/blog/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Delete, "/api/blog/00000000-0000-0000-0000-000000000001"),
        (HttpMethod.Put, "/api/settings/test-key"),
        (HttpMethod.Post, "/api/media/upload")
    ];

    private static readonly string[] AnonymousEndpoints =
    [
        "/health",
        "/api/health",
        "/api/projects",
        "/api/blog",
        "/api/skills",
        "/api/experience",
        "/api/settings"
    ];

    private async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost:5065")
        });

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        loginRes.EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public async Task Anonymous_Users_Get_401_On_All_Admin_Endpoints()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false,
            BaseAddress = new Uri("http://localhost:5065")
        });

        foreach (var (method, route) in AdminEndpoints)
        {
            var req = new HttpRequestMessage(method, route);
            if (method == HttpMethod.Post || method == HttpMethod.Put)
            {
                req.Content = JsonContent.Create(new { });
            }

            var res = await client.SendAsync(req);
            Assert.True(res.StatusCode == HttpStatusCode.Unauthorized,
                $"Expected 401 Unauthorized for anonymous user on {method} {route}, but got {res.StatusCode}");
        }
    }

    [Fact]
    public async Task NonAdmin_Users_Get_403_On_All_Admin_Endpoints()
    {
        var client = await CreateAuthenticatedClientAsync(
            CustomWebApplicationFactory.RegularUserEmail,
            CustomWebApplicationFactory.RegularUserPassword);

        // Verify non-admin user can access user profile /api/auth/me
        var meRes = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var me = await meRes.Content.ReadFromJsonAsync<UserDto>();
        Assert.False(me?.IsAdmin);

        // Assert 403 Forbidden on all admin endpoints
        foreach (var (method, route) in AdminEndpoints)
        {
            var req = new HttpRequestMessage(method, route);
            if (method == HttpMethod.Post || method == HttpMethod.Put)
            {
                req.Content = JsonContent.Create(new { });
            }

            var res = await client.SendAsync(req);
            Assert.True(res.StatusCode == HttpStatusCode.Forbidden,
                $"Expected 403 Forbidden for non-admin user on {method} {route}, but got {res.StatusCode}");
        }
    }

    [Fact]
    public async Task Anonymous_Endpoints_Are_Reachable_Without_Authentication()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false,
            BaseAddress = new Uri("http://localhost:5065")
        });

        foreach (var route in AnonymousEndpoints)
        {
            var res = await client.GetAsync(route);
            Assert.True(res.StatusCode == HttpStatusCode.OK,
                $"Expected 200 OK for anonymous endpoint {route}, but got {res.StatusCode}");
        }
    }

    [Fact]
    public async Task Revoked_Session_Gets_401_On_Next_Request()
    {
        var client = await CreateAuthenticatedClientAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        // Request succeeds initially
        var initialRes = await client.GetAsync("/api/admin/activity");
        Assert.Equal(HttpStatusCode.OK, initialRes.StatusCode);

        // Get the active session ID from DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var session = await db.UserSessions
            .Where(s => !s.IsRevoked)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(session);

        // Revoke the session directly in DB
        session.IsRevoked = true;
        session.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Next request with existing cookie must be rejected with 401
        var nextRes = await client.GetAsync("/api/admin/activity");
        Assert.Equal(HttpStatusCode.Unauthorized, nextRes.StatusCode);
    }

    [Fact]
    public async Task Logout_Invalidates_Current_Session()
    {
        var client = await CreateAuthenticatedClientAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        // Authenticated access works
        var meRes = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);

        // Logout
        var logoutRes = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, logoutRes.StatusCode);

        // Subsequent request must return 401 Unauthorized
        var afterLogoutRes = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogoutRes.StatusCode);
    }

    [Fact]
    public async Task SignOutEverywhere_Invalidates_Other_Devices()
    {
        // Device 1
        var client1 = await CreateAuthenticatedClientAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        // Device 2
        var client2 = await CreateAuthenticatedClientAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        // Both devices can access profile
        Assert.Equal(HttpStatusCode.OK, (await client1.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client2.GetAsync("/api/auth/me")).StatusCode);

        // Device 1 calls revoke-all
        var revokeAllRes = await client1.PostAsync("/api/auth/sessions/revoke-all", null);
        Assert.Equal(HttpStatusCode.OK, revokeAllRes.StatusCode);

        // Device 2 must now be rejected with 401 Unauthorized
        var client2After = await client2.GetAsync("/api/admin/activity");
        Assert.Equal(HttpStatusCode.Unauthorized, client2After.StatusCode);
    }

    [Fact]
    public void Only_Explicitly_Allowlisted_Endpoints_Have_AllowAnonymous()
    {
        var endpointSources = _factory.Services.GetServices<Microsoft.AspNetCore.Routing.EndpointDataSource>();
        var endpoints = endpointSources.SelectMany(es => es.Endpoints).ToList();

        var allowedAnonymousPatterns = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "health",
            "api/health",
            "api/projects",
            "api/projects/{slug}",
            "api/projects/{slug}/access-requests",
            "api/blog",
            "api/blog/{slug}",
            "api/skills",
            "api/experience",
            "api/settings",
            "api/settings/{key}",
            "api/site-content",
            "api/education",
            "api/certifications",
            "api/contact",
            "api/telemetry/visit",
            "api/telemetry/cv-download",
            "api/auth/login",
            "api/auth/register",
            "api/auth/verify-email",
            "api/auth/accept-invite",
            "api/auth/reset-password",
            "api/auth/forgot-password",
            "api/auth/resend-verification",
            // Media files are served to anonymous visitors on purpose (images and downloads on the public site).
            "api/Media/{id:guid}",
            "api/Media/{id:guid}/download"
        };

        var anonymousEndpoints = endpoints
            .Where(e => e.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() != null)
            .Select(e => (e as Microsoft.AspNetCore.Routing.RouteEndpoint)?.RoutePattern.RawText?.Trim('/'))
            .Where(pattern => pattern != null)
            .ToList();

        Assert.NotEmpty(anonymousEndpoints);

        foreach (var pattern in anonymousEndpoints)
        {
            Assert.True(allowedAnonymousPatterns.Contains(pattern!),
                $"Endpoint with pattern '{pattern}' has [AllowAnonymous] but is NOT on the explicit allowlist!");
        }
    }

    [Fact]
    public async Task Login_RateLimit_Ignores_Forwarded_Header_From_Untrusted_Source()
    {
        // The test client connects from loopback, which is trusted by default. Replace the
        // trusted network list so loopback is not a proxy: X-Forwarded-For must then be ignored.
        //
        // The in-memory test server has no real connection, so the remote address is null and the
        // forwarded-headers middleware trusts every request. Give the request a real, untrusted
        // address first (as a production connection would have), or the test proves nothing.
        var factory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ForwardedHeaders:KnownNetworks:0"] = "203.0.113.0/24"
                }));
            builder.ConfigureServices(services =>
                services.AddTransient<Microsoft.AspNetCore.Hosting.IStartupFilter>(_ =>
                    new FixedRemoteAddressStartupFilter(System.Net.IPAddress.Parse("198.51.100.1"))));
        });
        var client = factory.CreateClient();
        var clientIp = "198.51.100.77";
        var differentIp = "198.51.100.88";

        // Send 5 invalid login requests from clientIp (exhausting the 5-permit quota)
        for (int i = 0; i < 5; i++)
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
            {
                Content = JsonContent.Create(new { email = "admin@example.com", password = "WrongPassword123!" })
            };
            req.Headers.Add("X-Forwarded-For", clientIp);

            var res = await client.SendAsync(req);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, res.StatusCode);
        }

        // 6th request from clientIp should be rate limited (429)
        var blockedReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "admin@example.com", password = "WrongPassword123!" })
        };
        blockedReq.Headers.Add("X-Forwarded-For", clientIp);

        var blockedRes = await client.SendAsync(blockedReq);
        Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);

        // A spoofed X-Forwarded-For value must NOT bypass the limit. The source is not a trusted
        // proxy, so the header is ignored and the same bucket applies.
        var spoofedReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new { email = "admin@example.com", password = "WrongPassword123!" })
        };
        spoofedReq.Headers.Add("X-Forwarded-For", differentIp);

        var spoofedRes = await client.SendAsync(spoofedReq);
        Assert.Equal(HttpStatusCode.TooManyRequests, spoofedRes.StatusCode);
    }
}

/// <summary>Sets the connection's remote address before the rest of the pipeline runs (the test server leaves it empty).</summary>
internal sealed class FixedRemoteAddressStartupFilter(System.Net.IPAddress address) : Microsoft.AspNetCore.Hosting.IStartupFilter
{
    public Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> Configure(
        Action<Microsoft.AspNetCore.Builder.IApplicationBuilder> next) => app =>
    {
        app.Use((context, nextMiddleware) =>
        {
            context.Connection.RemoteIpAddress = address;
            return nextMiddleware();
        });
        next(app);
    };
}
