using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// What the activity log records and how the CV is named and counted: a member's history includes what was done to
/// their account, revokes name the member, failed sign-ins are logged once, and CV downloads are logged by the API when
/// the file is served. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class ActivityTrailTests : IClassFixture<MembersFactory>
{
    private const string Password = "member-pass-1";

    private readonly MembersFactory _factory;

    public ActivityTrailTests(MembersFactory factory)
    {
        _factory = factory;
    }

    private static string NewEmail() => $"s-{Guid.NewGuid():N}{CustomWebApplicationFactory.MemberEmailDomain}";

    private async Task<(HttpClient Client, string Email, Guid Id)> NewMemberAsync()
    {
        var email = NewEmail();
        var client = _factory.NewClient();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Trail Tester",
            email,
            password = Password,
            contactPrefUrl = (string?)null,
            fillTimeMs = 30_000L
        })).StatusCode);
        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "verify-email");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId, token })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password })).StatusCode);

        var list = await _factory.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/users?search={Uri.EscapeDataString(email)}");
        return (client, email, list.GetProperty("items")[0].GetProperty("id").GetGuid());
    }

    private async Task<List<JsonElement>> HistoryAsync(Guid memberId)
    {
        var page = await _factory.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/users/{memberId}/activity?pageSize=50");
        return page.GetProperty("items").EnumerateArray().ToList();
    }

    private async Task<List<JsonElement>> ActivityAsync(string action, string search)
    {
        var page = await _factory.Admin.GetFromJsonAsync<JsonElement>(
            $"/api/admin/activity?action={action}&search={Uri.EscapeDataString(search)}&pageSize=50");
        return page.GetProperty("items").EnumerateArray().ToList();
    }

    private static string Text(JsonElement entry, string name) => entry.GetProperty(name).GetString() ?? "";

    // ---- sessions ---------------------------------------------------------------------------------

    [Fact]
    public async Task A_Members_History_Shows_The_Session_An_Admin_Revoked_And_Names_The_Member()
    {
        var (member, email, id) = await NewMemberAsync();
        var sessions = await _factory.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/users/{id}/sessions");
        var sessionId = sessions[0].GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.DeleteAsync($"/api/admin/users/{id}/sessions/{sessionId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await member.GetAsync("/api/auth/me")).StatusCode);

        var history = await HistoryAsync(id);
        var revoke = history.Single(e => Text(e, "action") == "SESSION_REVOKE");
        Assert.Contains(email, Text(revoke, "summary"));
        Assert.Contains("Trail Tester", Text(revoke, "summary"));
        // It was written by the admin, and the history shows who.
        Assert.Equal(CustomWebApplicationFactory.AdminEmail, Text(revoke, "userEmail"));
        // The member's own sign-in is there too.
        Assert.Contains(history, e => Text(e, "action") == "USER_LOGIN");
    }

    [Fact]
    public async Task Revoking_All_Sessions_Says_How_Many_Were_Ended()
    {
        var (_, email, id) = await NewMemberAsync();
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PostAsync($"/api/admin/users/{id}/sessions/revoke-all", null)).StatusCode);

        var entry = (await HistoryAsync(id)).Single(e => Text(e, "action") == "USER_SESSIONS_REVOKE_ALL");
        Assert.Contains("1 session", Text(entry, "summary"));
        Assert.Contains(email, Text(entry, "summary"));
    }

    [Fact]
    public async Task A_Member_Ending_One_Of_Their_Own_Sessions_Is_Logged()
    {
        var (first, _, id) = await NewMemberAsync();
        // A second sign-in from another device, then the first one ends it.
        var second = _factory.NewClient();
        var email = (await _factory.Admin.GetFromJsonAsync<JsonElement>($"/api/admin/users/{id}")).GetProperty("email").GetString()!;
        Assert.Equal(HttpStatusCode.OK, (await second.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password })).StatusCode);

        var mine = await first.GetFromJsonAsync<JsonElement>("/api/auth/sessions");
        var other = mine.EnumerateArray().First(s => !s.GetProperty("isCurrent").GetBoolean() && !s.GetProperty("isRevoked").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await first.DeleteAsync($"/api/auth/sessions/{other.GetProperty("id").GetGuid()}")).StatusCode);

        var entry = (await HistoryAsync(id)).Single(e => Text(e, "action") == "SESSION_REVOKE");
        Assert.Contains("own sessions", Text(entry, "summary"));
        Assert.Equal(email, Text(entry, "userEmail"));
    }

    [Fact]
    public async Task A_Name_Change_Says_What_Changed()
    {
        var (member, _, id) = await NewMemberAsync();
        Assert.Equal(HttpStatusCode.OK, (await member.PutAsJsonAsync("/api/auth/profile", new { fullName = "Renamed Tester" })).StatusCode);

        var entry = (await HistoryAsync(id)).Single(e => Text(e, "action") == "USER_PROFILE_UPDATE");
        Assert.Contains("Trail Tester", Text(entry, "summary"));
        Assert.Contains("Renamed Tester", Text(entry, "summary"));
    }

    // ---- failed sign-ins ----------------------------------------------------------------------------

    [Fact]
    public async Task Repeated_Failed_Sign_Ins_Are_Logged_Once_And_Appear_In_The_Members_History()
    {
        var (_, email, id) = await NewMemberAsync();
        var stranger = _factory.NewClient();
        for (var i = 0; i < 3; i++)
        {
            var wrong = await stranger.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "wrong-password-9" });
            Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        }

        var failures = (await HistoryAsync(id)).Where(e => Text(e, "action") == "LOGIN_FAILED").ToList();
        Assert.Single(failures);
        Assert.Contains("wrong password", Text(failures[0], "summary"));
        Assert.DoesNotContain("wrong-password-9", Text(failures[0], "summary"));
    }

    [Fact]
    public async Task A_Failed_Sign_In_For_An_Unknown_Account_Never_Keeps_Text_That_Could_Be_A_Password()
    {
        // A password typed into the username box by mistake: it must not end up in the log.
        var typed = $"Sup3rSecret!{Guid.NewGuid():N}";
        var response = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = typed, Password = "whatever-pass-1" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var page = await _factory.Admin.GetFromJsonAsync<JsonElement>("/api/admin/activity?action=LOGIN_FAILED&pageSize=50");
        var summaries = page.GetProperty("items").EnumerateArray().Select(e => Text(e, "summary")).ToList();
        Assert.DoesNotContain(summaries, s => s.Contains(typed));
        Assert.Contains(summaries, s => s.Contains("(not an email)") && s.Contains("no such account"));

        // Something that looks like an email address is kept, because that is a likely typo of a real address.
        var email = $"nobody-{Guid.NewGuid():N}@example.com";
        await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "whatever-pass-1" });
        Assert.Contains(await ActivityAsync("LOGIN_FAILED", email), e => Text(e, "summary").Contains(email));
    }

    // ---- the CV -------------------------------------------------------------------------------------

    private async Task<(Guid Id, string FileName)> UploadCvAsync(string originalName = "my cv final (2).pdf")
    {
        var pdf = new ByteArrayContent(Encoding.ASCII.GetBytes("%PDF-1.4\n% test cv\n"));
        pdf.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        var form = new MultipartFormDataContent
        {
            { pdf, "file", originalName },
            { new StringContent("cv"), "category" },
            { new StringContent("Public"), "accessPolicy" }
        };
        var response = await _factory.Admin.PostAsync("/api/media/upload", form);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (body.GetProperty("id").GetGuid(), body.GetProperty("fileName").GetString()!);
    }

    [Fact]
    public async Task A_Cv_Is_Saved_And_Downloaded_As_Adnan_Cv_With_The_Upload_Date()
    {
        var (id, fileName) = await UploadCvAsync();
        try
        {
            Assert.Matches(new Regex(@"^Adnan CV \d{4}-\d{2}-\d{2}\.pdf$"), fileName);

            var visitor = _factory.NewClient();
            var open = await visitor.GetAsync($"/api/media/{id}");
            Assert.Equal(HttpStatusCode.OK, open.StatusCode);
            Assert.Equal("inline", open.Content.Headers.ContentDisposition!.DispositionType);
            Assert.Equal(fileName, open.Content.Headers.ContentDisposition.FileName?.Trim('"'));

            var save = await visitor.GetAsync($"/api/media/{id}/download");
            Assert.Equal("attachment", save.Content.Headers.ContentDisposition!.DispositionType);
            Assert.Equal(fileName, save.Content.Headers.ContentDisposition.FileName?.Trim('"'));

            // Uploading is in the activity log.
            Assert.Contains(await ActivityAsync("MEDIA_UPLOAD", fileName), e => Text(e, "entityId") == id.ToString());
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/media/{id}");
        }

        Assert.Contains(await ActivityAsync("MEDIA_DELETE", fileName), e => Text(e, "entityId") == id.ToString());
    }

    [Fact]
    public async Task A_Mistyped_Utc_Offset_Setting_Does_Not_Break_Cv_Uploads()
    {
        // "UTC+3" is not a number: the upload must still work (and fall back to Kuwait time) rather than answer 500.
        var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Media:CvUtcOffsetHours"] = "UTC+3" })));
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, BaseAddress = new Uri("http://localhost:5065") });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.AdminEmail,
            Password = CustomWebApplicationFactory.AdminPassword
        })).StatusCode);

        var pdf = new ByteArrayContent(Encoding.ASCII.GetBytes("%PDF-1.4\n% test cv\n"));
        pdf.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        var response = await client.PostAsync("/api/media/upload", new MultipartFormDataContent
        {
            { pdf, "file", "cv.pdf" },
            { new StringContent("cv"), "category" },
            { new StringContent("Public"), "accessPolicy" }
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Matches(new Regex(@"^Adnan CV \d{4}-\d{2}-\d{2}\.pdf$"), body.GetProperty("fileName").GetString()!);
        await client.DeleteAsync($"/api/media/{body.GetProperty("id").GetGuid()}");
    }

    [Fact]
    public async Task A_Crawler_Fetching_The_Cv_Is_Not_Counted_As_A_Download()
    {
        var (id, _) = await UploadCvAsync();
        try
        {
            var crawler = _factory.NewClient();
            crawler.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)");
            Assert.Equal(HttpStatusCode.OK, (await crawler.GetAsync($"/api/media/{id}")).StatusCode);

            var logged = (await ActivityAsync("CV_DOWNLOAD", "CV downloaded")).Where(e => Text(e, "entityId") == id.ToString());
            Assert.Empty(logged);
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/media/{id}");
        }
    }

    [Fact]
    public async Task A_Visitors_Cv_Download_Is_Logged_Once_And_The_Owners_Own_Preview_Is_Not()
    {
        var (id, _) = await UploadCvAsync();
        try
        {
            // The owner looking at their own CV is not a download.
            Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.GetAsync($"/api/media/{id}")).StatusCode);

            var visitor = _factory.NewClient();
            visitor.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36");
            Assert.Equal(HttpStatusCode.OK, (await visitor.GetAsync($"/api/media/{id}")).StatusCode);
            // A browser often asks twice (preview, then save): still one entry.
            Assert.Equal(HttpStatusCode.OK, (await visitor.GetAsync($"/api/media/{id}/download")).StatusCode);

            var logged = (await ActivityAsync("CV_DOWNLOAD", "CV downloaded")).Where(e => Text(e, "entityId") == id.ToString()).ToList();
            Assert.Single(logged);
            Assert.Equal("visitor", Text(logged[0], "userEmail"));
            Assert.Contains("Chrome", Text(logged[0], "deviceInfo"));
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/media/{id}");
        }
    }
}
