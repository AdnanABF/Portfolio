using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// Test host for the members and account tests. It signs in as the SuperAdmin once and raises the sign-in and
/// account rate limits, because these tests sign in and request links many times from one address.
/// </summary>
public class MembersFactory : CustomWebApplicationFactory, IAsyncLifetime
{
    public HttpClient Admin { get; private set; } = default!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:AuthPermitLimit"] = "1000",
                ["RateLimiting:AccountPermitLimit"] = "1000",
                ["RateLimiting:AccountTokenPermitLimit"] = "1000"
            }));
    }

    public HttpClient NewClient() => CreateClient(new WebApplicationFactoryClientOptions
    {
        HandleCookies = true,
        BaseAddress = new Uri("http://localhost:5065")
    });

    public async Task InitializeAsync()
    {
        Admin = NewClient();
        var login = await Admin.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = AdminEmail,
            Password = AdminPassword
        });
        login.EnsureSuccessStatusCode();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

/// <summary>Reads the link out of a captured account email.</summary>
internal static class TestMail
{
    private static readonly Regex LinkPattern = new(@"\?uid=(?<uid>[0-9a-fA-F-]{36})&token=(?<token>[A-Za-z0-9_-]+)", RegexOptions.Compiled);

    public static (Guid UserId, string Token) LastLink(CapturingEmailSender emails, string toEmail, string page)
    {
        var message = emails.Sent.Reverse().FirstOrDefault(m => m.To == toEmail && m.Text.Contains($"/{page}?"));
        Assert.True(message != null, $"No '{page}' email was sent to {toEmail}.");

        var match = LinkPattern.Match(message!.Text);
        Assert.True(match.Success, "The email contains no link with a user id and token.");
        return (Guid.Parse(match.Groups["uid"].Value), match.Groups["token"].Value);
    }

    public static int Count(CapturingEmailSender emails, string toEmail, string page) =>
        emails.Sent.Count(m => m.To == toEmail && m.Text.Contains($"/{page}?"));
}

/// <summary>
/// The members panel API: list, search, filters, create and invite, edit, deactivate, soft delete, erase,
/// the safety rules, sessions and history. Every test creates members with unique addresses on the test domain
/// (removed when the host is disposed). Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class MembersIntegrationTests : IClassFixture<MembersFactory>
{
    private const string MemberPassword = "member-pass-1";

    private readonly MembersFactory _factory;

    public MembersIntegrationTests(MembersFactory factory)
    {
        _factory = factory;
    }

    private static string NewMarker() => Guid.NewGuid().ToString("N");
    private static string NewEmail(string marker) => $"m-{marker}{CustomWebApplicationFactory.MemberEmailDomain}";

    private async Task<JsonElement> CreateMemberAsync(string name, string email, string role = "Member")
    {
        var res = await _factory.Admin.PostAsJsonAsync("/api/admin/users", new { fullName = name, email, role });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("member");
    }

    /// <summary>Accepts the invite email (sets the password), so the member can sign in.</summary>
    private async Task AcceptInviteAsync(string email, string password = MemberPassword)
    {
        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "accept-invite");
        var res = await _factory.NewClient().PostAsJsonAsync("/api/auth/accept-invite", new { userId, token, password });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    private async Task<HttpClient> SignInAsync(string email, string password = MemberPassword)
    {
        var client = _factory.NewClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = password });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return client;
    }

    private async Task<(Guid Id, string Email, HttpClient Client)> CreateActiveMemberAsync(string marker, string role = "Member")
    {
        var email = NewEmail(marker);
        var member = await CreateMemberAsync($"Member {marker}", email, role);
        await AcceptInviteAsync(email);
        return (member.GetProperty("id").GetGuid(), email, await SignInAsync(email));
    }

    private async Task<JsonElement> GetPageAsync(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/admin/users?{query}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<JsonElement> GetMemberAsync(Guid id)
    {
        var res = await _factory.Admin.GetAsync($"/api/admin/users/{id}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static HttpRequestMessage Delete(string url, object? body = null) =>
        new(HttpMethod.Delete, url) { Content = body == null ? null : JsonContent.Create(body) };

    private async Task<Guid> SuperAdminIdAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.Where(u => u.Email == CustomWebApplicationFactory.AdminEmail).Select(u => u.Id).SingleAsync();
    }

    // ---- who may use the panel -----------------------------------------------------------------

    [Fact]
    public async Task Admins_And_Members_Cannot_Use_The_Members_Panel_But_The_SuperAdmin_Can()
    {
        var adminOnly = _factory.NewClient();
        (await adminOnly.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.AdminOnlyEmail,
            Password = CustomWebApplicationFactory.AdminOnlyPassword
        })).EnsureSuccessStatusCode();

        // An Admin can use the admin area, but not the members panel.
        Assert.Equal(HttpStatusCode.OK, (await adminOnly.GetAsync("/api/admin/activity")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await adminOnly.GetAsync("/api/admin/users")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync("/api/admin/users")).StatusCode);
    }

    // ---- list, search, filters, paging -----------------------------------------------------------

    [Fact]
    public async Task List_Searches_By_Name_And_Email_Filters_By_Role_And_Status()
    {
        var marker = NewMarker();
        var admin = await CreateMemberAsync($"Ann Admin {marker}", NewEmail($"a-{marker}"), "Admin");
        await CreateMemberAsync($"Ben Member {marker}", NewEmail($"b-{marker}"));
        await CreateMemberAsync($"Cat Member {marker}", NewEmail($"c-{marker}"));

        var all = await GetPageAsync($"search={marker}");
        Assert.Equal(3, all.GetProperty("totalCount").GetInt32());

        // Search is case-insensitive and also matches the email.
        Assert.Equal(1, (await GetPageAsync($"search={Uri.EscapeDataString($"B-{marker}".ToUpperInvariant())}")).GetProperty("totalCount").GetInt32());

        var admins = await GetPageAsync($"search={marker}&role=Admin");
        Assert.Equal(1, admins.GetProperty("totalCount").GetInt32());
        Assert.Equal(admin.GetProperty("id").GetGuid(), admins.GetProperty("items")[0].GetProperty("id").GetGuid());

        // All three were just invited, so they are pending.
        Assert.Equal(3, (await GetPageAsync($"search={marker}&status=pending")).GetProperty("totalCount").GetInt32());
        Assert.Equal(0, (await GetPageAsync($"search={marker}&status=active")).GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task List_Pages_And_Past_The_End_Page_Is_Empty()
    {
        var marker = NewMarker();
        for (var i = 0; i < 12; i++)
        {
            await CreateMemberAsync($"Paged {marker} {i:D2}", NewEmail($"p{i}-{marker}"));
        }

        var first = await GetPageAsync($"search={marker}&page=1&pageSize=10");
        Assert.Equal(12, first.GetProperty("totalCount").GetInt32());
        Assert.Equal(10, first.GetProperty("items").GetArrayLength());

        Assert.Equal(2, (await GetPageAsync($"search={marker}&page=2&pageSize=10")).GetProperty("items").GetArrayLength());
        Assert.Equal(0, (await GetPageAsync($"search={marker}&page=9&pageSize=10")).GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("pageSize=15")]
    [InlineData("page=0")]
    [InlineData("page=2147483647")]
    [InlineData("role=Owner")]
    [InlineData("status=gone")]
    public async Task List_Invalid_Query_Is_A_400(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/admin/users?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // ---- create, invite and sign in ---------------------------------------------------------------

    [Fact]
    public async Task Create_Sends_An_Invite_And_Accepting_It_Lets_The_Member_Sign_In()
    {
        var marker = NewMarker();
        var email = NewEmail(marker);
        var member = await CreateMemberAsync($"Invited {marker}", email);

        Assert.Equal("pending", member.GetProperty("status").GetString());
        Assert.Equal("Member", member.GetProperty("role").GetString());
        Assert.Equal(1, TestMail.Count(_factory.Emails, email, "accept-invite"));

        // They cannot sign in before accepting: they have no password yet.
        var early = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = MemberPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, early.StatusCode);

        await AcceptInviteAsync(email);
        var client = await SignInAsync(email);

        var me = await (await client.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<UserDto>();
        Assert.False(me!.IsAdmin);
        Assert.Equal("Member", me.Role);

        var after = await GetMemberAsync(member.GetProperty("id").GetGuid());
        Assert.Equal("active", after.GetProperty("status").GetString());
        Assert.Equal("Password", after.GetProperty("lastLoginMethod").GetString());
        Assert.NotEqual(JsonValueKind.Null, after.GetProperty("lastLoginAt").ValueKind);
        Assert.Equal(1, after.GetProperty("activeSessions").GetInt32());
    }

    [Fact]
    public async Task Create_With_A_Taken_Email_Or_The_SuperAdmin_Role_Is_Rejected()
    {
        var marker = NewMarker();
        var email = NewEmail(marker);
        await CreateMemberAsync($"First {marker}", email);

        var duplicate = await _factory.Admin.PostAsJsonAsync("/api/admin/users", new { fullName = "Second", email, role = "Member" });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);

        var superAdmin = await _factory.Admin.PostAsJsonAsync("/api/admin/users", new { fullName = "Boss", email = NewEmail($"x-{marker}"), role = "SuperAdmin" });
        Assert.Equal(HttpStatusCode.BadRequest, superAdmin.StatusCode);
    }

    [Fact]
    public async Task Resend_Invite_Works_Until_The_Member_Has_Accepted()
    {
        var marker = NewMarker();
        var email = NewEmail(marker);
        var id = (await CreateMemberAsync($"Resend {marker}", email)).GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/resend-invite", null)).StatusCode);
        Assert.Equal(2, TestMail.Count(_factory.Emails, email, "accept-invite"));

        await AcceptInviteAsync(email);
        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/resend-invite", null)).StatusCode);
    }

    [Fact]
    public async Task Reset_Password_Email_Lets_The_Member_Choose_A_New_Password()
    {
        var marker = NewMarker();
        var (id, email, _) = await CreateActiveMemberAsync(marker);

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/reset-password", null)).StatusCode);

        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "reset-password");
        var reset = await _factory.NewClient().PostAsJsonAsync("/api/auth/reset-password", new { userId, token, password = "another-pass-2" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        // The old password no longer works; the new one does.
        var old = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = MemberPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, old.StatusCode);
        await SignInAsync(email, "another-pass-2");
    }

    // ---- edit -------------------------------------------------------------------------------------

    [Fact]
    public async Task Update_Changes_The_Name_And_A_Role_Change_Ends_Their_Sessions()
    {
        var marker = NewMarker();
        var (id, email, client) = await CreateActiveMemberAsync(marker);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var res = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{id}", new { fullName = $"Renamed {marker}", email, role = "Admin" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var updated = await GetMemberAsync(id);
        Assert.Equal($"Renamed {marker}", updated.GetProperty("fullName").GetString());
        Assert.Equal("Admin", updated.GetProperty("role").GetString());

        // The role lives in their sign-in cookie, so the old session is gone and they must sign in again.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        var again = await SignInAsync(email);
        var me = await (await again.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<UserDto>();
        Assert.True(me!.IsAdmin);
    }

    [Fact]
    public async Task Changing_The_Email_Needs_Confirmation_Again_And_A_Taken_Email_Is_Rejected()
    {
        var marker = NewMarker();
        var (id, email, _) = await CreateActiveMemberAsync(marker);
        var other = NewEmail($"o-{marker}");
        await CreateMemberAsync($"Other {marker}", other);

        var taken = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{id}", new { fullName = "Same", email = other, role = "Member" });
        Assert.Equal(HttpStatusCode.BadRequest, taken.StatusCode);

        var newEmail = NewEmail($"n-{marker}");
        var res = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{id}", new { fullName = "Same", email = newEmail, role = "Member" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        Assert.Equal("pending", (await GetMemberAsync(id)).GetProperty("status").GetString());
        Assert.Equal(1, TestMail.Count(_factory.Emails, newEmail, "verify-email"));
    }

    // ---- active / inactive ------------------------------------------------------------------------

    [Fact]
    public async Task Deactivate_Blocks_Sign_In_And_Ends_Sessions_And_Activate_Restores_It()
    {
        var marker = NewMarker();
        var (id, email, client) = await CreateActiveMemberAsync(marker);

        var deactivate = await _factory.Admin.PostAsync($"/api/admin/users/{id}/deactivate", null);
        Assert.Equal(HttpStatusCode.OK, deactivate.StatusCode);
        Assert.Equal("inactive", (await GetMemberAsync(id)).GetProperty("status").GetString());

        // The session dies on the member's next request, and a new sign-in says why it fails.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        var login = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = MemberPassword });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);
        Assert.Equal("account_disabled", (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/activate", null)).StatusCode);
        await SignInAsync(email);
    }

    [Fact]
    public async Task A_Wrong_Password_Never_Reveals_That_The_Account_Is_Turned_Off()
    {
        var marker = NewMarker();
        var (id, email, _) = await CreateActiveMemberAsync(marker);
        await _factory.Admin.PostAsync($"/api/admin/users/{id}/deactivate", null);

        var res = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "wrong-password-9" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ---- soft delete, restore and erase -----------------------------------------------------------

    [Fact]
    public async Task Soft_Delete_Hides_The_Member_Blocks_Sign_In_And_Can_Be_Restored()
    {
        var marker = NewMarker();
        var (id, email, client) = await CreateActiveMemberAsync(marker);

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.DeleteAsync($"/api/admin/users/{id}")).StatusCode);

        // Hidden from the default list, visible under "deleted", and signed out at once.
        Assert.Equal(0, (await GetPageAsync($"search={marker}")).GetProperty("totalCount").GetInt32());
        Assert.Equal(1, (await GetPageAsync($"search={marker}&status=deleted")).GetProperty("totalCount").GetInt32());
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        var login = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = MemberPassword });
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);

        // A deleted member cannot be edited until restored.
        var edit = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{id}", new { fullName = "X", email, role = "Member" });
        Assert.Equal(HttpStatusCode.BadRequest, edit.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/restore", null)).StatusCode);
        Assert.Equal("active", (await GetMemberAsync(id)).GetProperty("status").GetString());
        await SignInAsync(email);
    }

    [Fact]
    public async Task Erase_Needs_The_Email_Removes_The_Member_And_Anonymizes_Their_Log_Entries()
    {
        var marker = NewMarker();
        var (id, email, _) = await CreateActiveMemberAsync(marker);

        // A message the same person sent through the contact form.
        Guid inquiryId;
        using (var seedScope = _factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var inquiry = new ContactInquiry { Name = "Real Name", Email = email, Subject = "Hello", Message = "A private message.", Type = ContactInquiryTypes.Contact };
            seedDb.ContactInquiries.Add(inquiry);
            await seedDb.SaveChangesAsync();
            inquiryId = inquiry.Id;
        }

        // A wrong confirmation changes nothing.
        var wrong = await _factory.Admin.SendAsync(Delete($"/api/admin/users/{id}/erase", new { confirmEmail = "someone-else@members.test" }));
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync($"/api/admin/users/{id}")).StatusCode);

        var erased = await _factory.Admin.SendAsync(Delete($"/api/admin/users/{id}/erase", new { confirmEmail = email.ToUpperInvariant() }));
        Assert.Equal(HttpStatusCode.NoContent, erased.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.Admin.GetAsync($"/api/admin/users/{id}")).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // No log entry still holds the email or the name, and the entries the member wrote are anonymized.
        Assert.False(await db.ActivityLogs.AnyAsync(a => a.UserEmail == email || a.Summary.Contains(email) || a.Summary.Contains(marker)));
        Assert.True(await db.ActivityLogs.AnyAsync(a => a.Action == "USER_LOGIN" && a.UserEmail == "erased user" && a.IpAddress == ""));
        Assert.True(await db.ActivityLogs.AnyAsync(a => a.Action == "USER_CREATE" && a.EntityId == id.ToString() && a.Summary.Contains("erased user")));
        Assert.False(await db.Users.AnyAsync(u => u.Id == id));

        // The contact message they sent no longer carries their name, address or text.
        var erasedInquiry = await db.ContactInquiries.AsNoTracking().SingleAsync(i => i.Id == inquiryId);
        Assert.Equal("erased user", erasedInquiry.Name);
        Assert.Equal("erased@erased.invalid", erasedInquiry.Email);
        Assert.Equal("[erased]", erasedInquiry.Message);
    }

    // ---- safety rules -----------------------------------------------------------------------------

    [Fact]
    public async Task The_SuperAdmin_Cannot_Be_Changed_Turned_Off_Deleted_Or_Erased()
    {
        var id = await SuperAdminIdAsync();
        var email = CustomWebApplicationFactory.AdminEmail;

        var edit = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{id}", new { fullName = "Hacked", email, role = "Member" });
        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/deactivate", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.DeleteAsync($"/api/admin/users/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.SendAsync(Delete($"/api/admin/users/{id}/erase", new { confirmEmail = email }))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/reset-password", null)).StatusCode);

        var member = await GetMemberAsync(id);
        Assert.True(member.GetProperty("isSuperAdmin").GetBoolean());
        Assert.Equal("active", member.GetProperty("status").GetString());
        Assert.Equal("SuperAdmin", member.GetProperty("role").GetString());
    }

    // ---- sessions and history ---------------------------------------------------------------------

    [Fact]
    public async Task Sessions_Can_Be_Listed_Revoked_One_By_One_And_All_At_Once()
    {
        var marker = NewMarker();
        var (id, email, client1) = await CreateActiveMemberAsync(marker);
        var client2 = await SignInAsync(email);

        var active = await (await _factory.Admin.GetAsync($"/api/admin/users/{id}/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, active.GetArrayLength());

        // Revoking one session signs out exactly one of the two devices.
        var first = active[0].GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.DeleteAsync($"/api/admin/users/{id}/sessions/{first}")).StatusCode);
        var statuses = new[] { (await client1.GetAsync("/api/auth/me")).StatusCode, (await client2.GetAsync("/api/auth/me")).StatusCode };
        Assert.Equal(1, statuses.Count(s => s == HttpStatusCode.Unauthorized));
        Assert.Equal(1, statuses.Count(s => s == HttpStatusCode.OK));

        // Ended sessions only show when asked for.
        Assert.Equal(1, (await (await _factory.Admin.GetAsync($"/api/admin/users/{id}/sessions")).Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength());
        var withEnded = await (await _factory.Admin.GetAsync($"/api/admin/users/{id}/sessions?includeEnded=true")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, withEnded.GetArrayLength());
        Assert.Equal(1, withEnded.EnumerateArray().Count(s => s.GetProperty("isRevoked").GetBoolean()));

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/sessions/revoke-all", null)).StatusCode);
        Assert.Equal(0, (await (await _factory.Admin.GetAsync($"/api/admin/users/{id}/sessions")).Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength());
    }

    [Fact]
    public async Task A_Session_Of_Another_Member_Cannot_Be_Revoked_Through_This_Member()
    {
        var (idA, _, _) = await CreateActiveMemberAsync(NewMarker());
        var (idB, _, _) = await CreateActiveMemberAsync(NewMarker());

        var sessionsOfB = await (await _factory.Admin.GetAsync($"/api/admin/users/{idB}/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        var sessionOfB = sessionsOfB[0].GetProperty("id").GetGuid();

        var res = await _factory.Admin.DeleteAsync($"/api/admin/users/{idA}/sessions/{sessionOfB}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal(1, (await (await _factory.Admin.GetAsync($"/api/admin/users/{idB}/sessions")).Content.ReadFromJsonAsync<JsonElement>()).GetArrayLength());
    }

    [Fact]
    public async Task History_Lists_The_Members_Activity_And_Rejects_Bad_Queries()
    {
        var (id, _, _) = await CreateActiveMemberAsync(NewMarker());

        var res = await _factory.Admin.GetAsync($"/api/admin/users/{id}/activity");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var page = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(page.GetProperty("totalCount").GetInt32() >= 1);
        Assert.Contains(page.GetProperty("items").EnumerateArray(), i => i.GetProperty("action").GetString() == "USER_LOGIN");

        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.GetAsync($"/api/admin/users/{id}/activity?pageSize=15")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.Admin.GetAsync($"/api/admin/users/{Guid.NewGuid()}/activity")).StatusCode);
    }

    // ---- the owner is only ever the configured account ------------------------------------------

    private async Task<(ApplicationUser Former, UserManager<ApplicationUser> Users, IServiceProvider Services)> CreateFormerOwnerAsync(IServiceScope scope)
    {
        var services = scope.ServiceProvider;
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // A former owner: someone who holds SuperAdmin although they are not the configured Admin:Email.
        var email = NewEmail(NewMarker());
        var former = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Former Owner",
            Role = UserRoles.SuperAdmin,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };
        Assert.True((await userManager.CreateAsync(former, MemberPassword)).Succeeded);
        await userManager.AddToRolesAsync(former, new[] { UserRoles.Admin, UserRoles.SuperAdmin });
        return (former, userManager, services);
    }

    private static Task SeedAsync(IServiceProvider services, bool demoteFormerOwners)
    {
        // The real configuration plus the one switch under test.
        var config = new ConfigurationBuilder()
            .AddConfiguration(services.GetRequiredService<IConfiguration>())
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Admin:DemoteFormerOwners"] = demoteFormerOwners ? "true" : "false" })
            .Build();

        return DbInitializer.SeedAsync(
            services.GetRequiredService<AppDbContext>(),
            services.GetRequiredService<UserManager<ApplicationUser>>(),
            services.GetRequiredService<RoleManager<IdentityRole<Guid>>>(),
            config,
            NullLogger.Instance);
    }

    [Fact]
    public async Task Seeding_Only_Warns_About_A_Former_Owner_Unless_Told_To_Demote_Them()
    {
        // A typo in Admin:Email looks exactly like a changed owner, so by default nobody loses the role.
        using var scope = _factory.Services.CreateScope();
        var (former, userManager, services) = await CreateFormerOwnerAsync(scope);

        await SeedAsync(services, demoteFormerOwners: false);

        var after = await userManager.FindByIdAsync(former.Id.ToString());
        Assert.True(await userManager.IsInRoleAsync(after!, UserRoles.SuperAdmin));
        Assert.Equal(UserRoles.SuperAdmin, after!.Role);

        // Leave nobody behind who still holds the role for the tests that follow.
        await userManager.RemoveFromRoleAsync(after, UserRoles.SuperAdmin);
        after.Role = UserRoles.Admin;
        await userManager.UpdateAsync(after);
    }

    [Fact]
    public async Task Seeding_Demotes_A_Former_Owner_When_Asked_And_Keeps_The_Configured_Owner()
    {
        using var scope = _factory.Services.CreateScope();
        var (former, userManager, services) = await CreateFormerOwnerAsync(scope);

        await SeedAsync(services, demoteFormerOwners: true);

        var after = await userManager.FindByIdAsync(former.Id.ToString());
        Assert.Equal(UserRoles.Admin, after!.Role);
        Assert.False(await userManager.IsInRoleAsync(after, UserRoles.SuperAdmin));
        Assert.True(await userManager.IsInRoleAsync(after, UserRoles.Admin));

        var owner = await userManager.FindByEmailAsync(CustomWebApplicationFactory.AdminEmail);
        Assert.True(await userManager.IsInRoleAsync(owner!, UserRoles.SuperAdmin));
        Assert.Equal(UserRoles.SuperAdmin, owner!.Role);
    }

    // ---- the session you are using ----------------------------------------------------------------

    [Fact]
    public async Task Your_Own_Session_Is_Marked_Listed_First_And_Cannot_Be_Revoked()
    {
        var ownerId = await SuperAdminIdAsync();

        // A second device, so there is something else in the list.
        await SignInAsync(CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var sessions = await (await _factory.Admin.GetAsync($"/api/admin/users/{ownerId}/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(sessions.GetArrayLength() >= 2);
        Assert.True(sessions[0].GetProperty("isCurrent").GetBoolean());
        Assert.Equal(1, sessions.EnumerateArray().Count(s => s.GetProperty("isCurrent").GetBoolean()));

        // Revoking the session you are using is refused, and you stay signed in.
        var current = sessions[0].GetProperty("id").GetGuid();
        var refused = await _factory.Admin.DeleteAsync($"/api/admin/users/{ownerId}/sessions/{current}");
        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync("/api/auth/me")).StatusCode);

        // Another member's list never marks your session as theirs.
        var (otherId, _, _) = await CreateActiveMemberAsync(NewMarker());
        var theirs = await (await _factory.Admin.GetAsync($"/api/admin/users/{otherId}/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.DoesNotContain(theirs.EnumerateArray(), s => s.GetProperty("isCurrent").GetBoolean());
    }

    [Fact]
    public async Task Revoking_All_Sessions_Of_Your_Own_Account_Keeps_The_One_You_Are_Using()
    {
        var ownerId = await SuperAdminIdAsync();
        var otherDevice = await SignInAsync(CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);
        Assert.Equal(HttpStatusCode.OK, (await otherDevice.GetAsync("/api/auth/me")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{ownerId}/sessions/revoke-all", null)).StatusCode);

        // The other device is signed out; this one is not.
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherDevice.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync("/api/auth/me")).StatusCode);

        var remaining = await (await _factory.Admin.GetAsync($"/api/admin/users/{ownerId}/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, remaining.GetArrayLength());
        Assert.True(remaining[0].GetProperty("isCurrent").GetBoolean());
    }

    // ---- the last admin ---------------------------------------------------------------------------

    [Fact]
    public async Task The_Last_Active_Admin_Cannot_Be_Deactivated_Deleted_Or_Demoted()
    {
        var (adminId, adminEmail, _) = await CreateActiveMemberAsync(NewMarker(), role: "Admin");

        // Every other active admin is switched off in the database for the length of this test (their
        // sessions keep working: the sign-in check looks at the session, not at this flag), then restored.
        List<Guid> others;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            others = await db.Users
                .Where(u => u.Id != adminId && u.DeletedAt == null && u.IsActive && u.EmailConfirmed && (u.Role == UserRoles.SuperAdmin || u.Role == UserRoles.Admin))
                .Select(u => u.Id)
                .ToListAsync();
            await db.Users.Where(u => others.Contains(u.Id)).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));
        }

        try
        {
            Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.PostAsync($"/api/admin/users/{adminId}/deactivate", null)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await _factory.Admin.DeleteAsync($"/api/admin/users/{adminId}")).StatusCode);

            var demote = await _factory.Admin.PutAsJsonAsync($"/api/admin/users/{adminId}", new { fullName = "Demoted", email = adminEmail, role = "Member" });
            Assert.Equal(HttpStatusCode.Conflict, demote.StatusCode);

            Assert.Equal("active", (await GetMemberAsync(adminId)).GetProperty("status").GetString());
        }
        finally
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.Where(u => others.Contains(u.Id)).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, true));
        }

        // With the other admins back, the same admin can be deactivated like anyone else.
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{adminId}/deactivate", null)).StatusCode);
    }

    // ---- stats ------------------------------------------------------------------------------------

    [Fact]
    public async Task Stats_Count_Everyone_Who_Is_Not_Deleted_And_Anyone_Who_Signed_In_During_The_Last_30_Days()
    {
        async Task<JsonElement> StatsAsync() => (await GetPageAsync("pageSize=10")).GetProperty("stats");

        var before = await StatsAsync();

        // Seeded straight into the database so the sign-in dates can be chosen.
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            ApplicationUser Make(string tag, DateTime? lastLogin, DateTime? deletedAt = null) => new()
            {
                UserName = NewEmail(tag),
                NormalizedUserName = NewEmail(tag).ToUpperInvariant(),
                Email = NewEmail(tag),
                NormalizedEmail = NewEmail(tag).ToUpperInvariant(),
                FullName = $"Stats {tag}",
                Role = UserRoles.Member,
                EmailConfirmed = true,
                IsActive = deletedAt == null,
                LastLoginAt = lastLogin,
                DeletedAt = deletedAt,
                SecurityStamp = Guid.NewGuid().ToString(),
                ConcurrencyStamp = Guid.NewGuid().ToString()
            };

            db.Users.AddRange(
                Make($"recent-{NewMarker()}", DateTime.UtcNow.AddDays(-29)),
                Make($"old-{NewMarker()}", DateTime.UtcNow.AddDays(-31)),
                Make($"gone-{NewMarker()}", DateTime.UtcNow.AddDays(-1), deletedAt: DateTime.UtcNow));
            await db.SaveChangesAsync();
        }

        var after = await StatsAsync();

        // Two users are live (recent and old), one is deleted. Only the recent one signed in within 30 days.
        Assert.Equal(before.GetProperty("totalUsers").GetInt32() + 2, after.GetProperty("totalUsers").GetInt32());
        Assert.Equal(before.GetProperty("loggedInLast30Days").GetInt32() + 1, after.GetProperty("loggedInLast30Days").GetInt32());
        Assert.Equal(before.GetProperty("deleted").GetInt32() + 1, after.GetProperty("deleted").GetInt32());
    }
}
