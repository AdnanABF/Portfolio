using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// Test host that signs in as admin once, so the many inbox tests do not each hit the login rate limit.
/// </summary>
public class InboxFactory : CustomWebApplicationFactory, IAsyncLifetime
{
    public HttpClient Admin { get; private set; } = default!;

    public async Task InitializeAsync()
    {
        Admin = CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost:5065")
        });

        var login = await Admin.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = AdminEmail,
            Password = AdminPassword
        });
        login.EnsureSuccessStatusCode();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

/// <summary>
/// The admin inbox: search, filters, paging, status changes and bulk updates. Every test seeds its own
/// rows containing a unique marker and searches for it, so tests do not interfere with each other or with
/// messages already in the test database. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class ContactInboxIntegrationTests : IClassFixture<InboxFactory>
{
    private readonly InboxFactory _factory;

    public ContactInboxIntegrationTests(InboxFactory factory)
    {
        _factory = factory;
    }

    private static string NewMarker() => Guid.NewGuid().ToString("N");

    private async Task<List<ContactInquiry>> SeedAsync(params ContactInquiry[] inquiries)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContactInquiries.AddRange(inquiries);
        await db.SaveChangesAsync();
        return inquiries.ToList();
    }

    private static ContactInquiry Inquiry(
        string marker,
        string? name = null,
        string? email = null,
        string? subject = null,
        string? message = null,
        string status = ContactInquiryStatuses.Unread,
        string type = ContactInquiryTypes.Contact,
        DateTime? createdAt = null) => new()
    {
        Name = name ?? "Visitor",
        Email = email ?? $"v-{Guid.NewGuid():N}@example.com",
        Subject = subject ?? $"Subject {marker}",
        Message = message ?? "A message long enough to be valid.",
        Status = status,
        Type = type,
        CreatedAt = createdAt ?? DateTime.UtcNow
    };

    private async Task<JsonElement> GetPageAsync(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/contact/inquiries?{query}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static List<string> Subjects(JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("subject").GetString()!).ToList();

    private static string Search(string marker) => $"search={Uri.EscapeDataString(marker)}";

    // ---- search ----------------------------------------------------------------------------

    [Fact]
    public async Task Search_Matches_Name_Email_Subject_And_Message_Case_Insensitively()
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, name: $"Ann {marker}", subject: "by name"),
            Inquiry(marker, email: $"{marker}@example.com", subject: "by email"),
            Inquiry(marker, subject: $"by subject {marker}"),
            Inquiry(marker, subject: "by message", message: $"the body mentions {marker} here"),
            Inquiry(marker, subject: "no match at all", message: "nothing relevant"));

        var page = await GetPageAsync(Search(marker.ToUpperInvariant()));

        Assert.Equal(4, page.GetProperty("totalCount").GetInt32());
        var subjects = Subjects(page);
        Assert.Contains("by name", subjects);
        Assert.Contains("by email", subjects);
        Assert.Contains("by message", subjects);
        Assert.DoesNotContain("no match at all", subjects);
    }

    [Fact]
    public async Task Search_Treats_Percent_And_Underscore_As_Plain_Characters()
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, subject: $"{marker}-50%-off"),
            Inquiry(marker, subject: $"{marker}-50-off"),
            Inquiry(marker, subject: $"{marker}_x"),
            Inquiry(marker, subject: $"{marker}yx"));

        var percent = await GetPageAsync(Search($"{marker}-50%"));
        var underscore = await GetPageAsync(Search($"{marker}_"));

        Assert.Equal(1, percent.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, underscore.GetProperty("totalCount").GetInt32());
    }

    // ---- filters ---------------------------------------------------------------------------

    [Fact]
    public async Task Archived_Messages_Are_Hidden_Unless_Asked_For()
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, subject: "visible"),
            Inquiry(marker, subject: "hidden", status: ContactInquiryStatuses.Archived));

        var normal = await GetPageAsync(Search(marker));
        var archived = await GetPageAsync($"{Search(marker)}&status=archived");

        Assert.Equal(new[] { "visible" }, Subjects(normal));
        Assert.Equal(new[] { "hidden" }, Subjects(archived));
    }

    [Theory]
    [InlineData("unread")]
    [InlineData("read")]
    [InlineData("replied")]
    public async Task Status_Filter_Returns_Only_That_Status(string status)
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, subject: "u", status: ContactInquiryStatuses.Unread),
            Inquiry(marker, subject: "r", status: ContactInquiryStatuses.Read),
            Inquiry(marker, subject: "p", status: ContactInquiryStatuses.Replied));

        var page = await GetPageAsync($"{Search(marker)}&status={status}");

        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Equal(status, page.GetProperty("items")[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task Type_Filter_Separates_Messages_From_Repo_Requests()
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, subject: "message"),
            Inquiry(marker, subject: "repo", type: ContactInquiryTypes.RepoRequest));

        var messages = await GetPageAsync($"{Search(marker)}&type=contact");
        var repoRequests = await GetPageAsync($"{Search(marker)}&type=repo_request");

        Assert.Equal(new[] { "message" }, Subjects(messages));
        Assert.Equal(new[] { "repo" }, Subjects(repoRequests));
    }

    [Fact]
    public async Task Date_Range_Includes_From_And_Excludes_To()
    {
        var marker = NewMarker();
        var january = new DateTime(2020, 1, 15, 10, 0, 0, DateTimeKind.Utc);
        var february = new DateTime(2020, 2, 15, 10, 0, 0, DateTimeKind.Utc);
        await SeedAsync(
            Inquiry(marker, subject: "january", createdAt: january),
            Inquiry(marker, subject: "february", createdAt: february));

        var from = Uri.EscapeDataString(new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero).ToString("o"));
        var to = Uri.EscapeDataString(new DateTimeOffset(2020, 2, 1, 0, 0, 0, TimeSpan.Zero).ToString("o"));

        var page = await GetPageAsync($"{Search(marker)}&from={from}&to={to}");

        Assert.Equal(new[] { "january" }, Subjects(page));
    }

    // ---- paging ----------------------------------------------------------------------------

    [Fact]
    public async Task Paging_Returns_Newest_First_With_Totals()
    {
        var marker = NewMarker();
        var now = DateTime.UtcNow;
        var rows = Enumerable.Range(0, 25)
            .Select(i => Inquiry(marker, subject: $"{marker} #{i:00}", createdAt: now.AddMinutes(-i)))
            .ToArray();
        await SeedAsync(rows);

        var first = await GetPageAsync($"{Search(marker)}&page=1&pageSize=10");
        var third = await GetPageAsync($"{Search(marker)}&page=3&pageSize=10");
        var twenty = await GetPageAsync($"{Search(marker)}&page=2&pageSize=20");

        Assert.Equal(25, first.GetProperty("totalCount").GetInt32());
        Assert.Equal(10, first.GetProperty("items").GetArrayLength());
        Assert.Equal($"{marker} #00", Subjects(first)[0]);
        Assert.Equal(5, third.GetProperty("items").GetArrayLength());
        Assert.Equal($"{marker} #24", Subjects(third).Last());
        Assert.Equal(5, twenty.GetProperty("items").GetArrayLength());
        Assert.Equal(20, twenty.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task A_Page_Past_The_End_Is_Empty_But_Keeps_The_Total()
    {
        var marker = NewMarker();
        await SeedAsync(Inquiry(marker));

        var page = await GetPageAsync($"{Search(marker)}&page=5&pageSize=10");

        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, page.GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("pageSize=7")]
    [InlineData("pageSize=1000")]
    [InlineData("page=0")]
    [InlineData("status=starred")]
    [InlineData("type=spam")]
    public async Task Invalid_Query_Values_Return_400(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/contact/inquiries?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Unread_Count_Covers_All_Unread_Messages_Whatever_The_Filters_Are()
    {
        var marker = NewMarker();
        await SeedAsync(
            Inquiry(marker, status: ContactInquiryStatuses.Unread),
            Inquiry(marker, status: ContactInquiryStatuses.Unread),
            Inquiry(marker, status: ContactInquiryStatuses.Read));

        var filtered = await GetPageAsync($"{Search(marker)}&status=read");

        Assert.Equal(1, filtered.GetProperty("totalCount").GetInt32());
        Assert.True(filtered.GetProperty("unreadCount").GetInt32() >= 2);
    }

    // ---- status changes --------------------------------------------------------------------

    private static StringContent JsonBody(string json) => new(json, Encoding.UTF8, "application/json");

    [Fact]
    public async Task A_Single_Status_Can_Be_Changed_And_Unknown_Ones_Are_Refused()
    {
        var marker = NewMarker();
        var inquiry = (await SeedAsync(Inquiry(marker))).Single();

        var invalid = await _factory.Admin.PutAsync($"/api/contact/inquiries/{inquiry.Id}/status", JsonBody("\"starred\""));
        var valid = await _factory.Admin.PutAsync($"/api/contact/inquiries/{inquiry.Id}/status", JsonBody("\"Replied\""));
        var missing = await _factory.Admin.PutAsync($"/api/contact/inquiries/{Guid.NewGuid()}/status", JsonBody("\"read\""));

        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal(HttpStatusCode.OK, valid.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        var page = await GetPageAsync($"{Search(marker)}&status=replied");
        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Bulk_Update_Changes_Every_Selected_Message()
    {
        var marker = NewMarker();
        var rows = await SeedAsync(Inquiry(marker), Inquiry(marker), Inquiry(marker), Inquiry(marker));

        var res = await _factory.Admin.PostAsJsonAsync("/api/contact/inquiries/bulk-status", new
        {
            ids = rows.Take(3).Select(r => r.Id),
            status = "archived"
        });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, body.GetProperty("updated").GetInt32());

        var archived = await GetPageAsync($"{Search(marker)}&status=archived");
        var remaining = await GetPageAsync(Search(marker));
        Assert.Equal(3, archived.GetProperty("totalCount").GetInt32());
        Assert.Equal(1, remaining.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Bulk_Update_Rejects_Empty_Selections_And_Unknown_Statuses()
    {
        var empty = await _factory.Admin.PostAsJsonAsync("/api/contact/inquiries/bulk-status", new
        {
            ids = Array.Empty<Guid>(),
            status = "read"
        });
        var unknown = await _factory.Admin.PostAsJsonAsync("/api/contact/inquiries/bulk-status", new
        {
            ids = new[] { Guid.NewGuid() },
            status = "starred"
        });

        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);
    }
}
