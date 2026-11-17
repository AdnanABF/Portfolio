using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// A signed-in session must stay valid when Identity re-checks the security stamp (every 30 minutes in real use),
/// and a revoked session must only ever affect its own owner. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class SessionLifetimeTests : IClassFixture<MembersFactory>
{
    private const string Password = "member-pass-1";

    private readonly MembersFactory _factory;

    public SessionLifetimeTests(MembersFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task A_Session_Survives_The_Security_Stamp_Refresh()
    {
        // The stamp is normally re-checked every 30 minutes. Re-check it on every request so a few calls show what
        // happens at that moment: before the fix the session id was lost and every call after sign-in answered 401.
        var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero)));
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost:5065")
        });

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.AdminEmail,
            Password = CustomWebApplicationFactory.AdminPassword
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        for (var i = 0; i < 4; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        }
    }

    [Fact]
    public async Task A_Revoked_Member_Session_Is_Refused_Repeatedly_And_The_Admin_Stays_Signed_In()
    {
        var email = $"s-{Guid.NewGuid():N}{CustomWebApplicationFactory.MemberEmailDomain}";
        var member = _factory.NewClient();
        Assert.Equal(HttpStatusCode.Accepted, (await member.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Session Tester",
            email,
            password = Password,
            contactPrefUrl = (string?)null,
            fillTimeMs = 30_000L
        })).StatusCode);
        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "verify-email");
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsJsonAsync("/api/auth/verify-email", new { userId, token })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await member.GetAsync("/api/auth/sessions")).StatusCode);

        var list = await _factory.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/users?search={Uri.EscapeDataString(email)}");
        var id = list.GetProperty("items")[0].GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/sessions/revoke-all", null)).StatusCode);

        // A browser stuck in a loop keeps asking: every answer is 401 and nothing else is affected.
        for (var i = 0; i < 50; i++)
        {
            var response = await member.GetAsync(i % 2 == 0 ? "/api/auth/sessions" : "/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync("/api/admin/users")).StatusCode);
    }
}
