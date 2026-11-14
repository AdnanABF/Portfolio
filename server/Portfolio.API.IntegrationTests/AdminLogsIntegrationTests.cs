using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// The admin activity and system log endpoints: search, filters, date range and paging. Each test seeds rows
/// carrying a unique marker and searches for it, so tests do not interfere with each other or with existing
/// logs. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class AdminLogsIntegrationTests : IClassFixture<InboxFactory>
{
    private readonly InboxFactory _factory;

    public AdminLogsIntegrationTests(InboxFactory factory)
    {
        _factory = factory;
    }

    private static string NewMarker() => Guid.NewGuid().ToString("N");
    private static string Search(string marker) => $"search={Uri.EscapeDataString(marker)}";

    private async Task SeedAsync(IEnumerable<ActivityLog>? activity = null, IEnumerable<SystemLog>? system = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (activity != null) db.ActivityLogs.AddRange(activity);
        if (system != null) db.SystemLogs.AddRange(system);
        await db.SaveChangesAsync();
    }

    private static ActivityLog Activity(string marker, string action = "TEST_ACTION", string entityType = "TestEntity",
        string? summary = null, DateTime? timestamp = null) => new()
    {
        UserEmail = "admin@example.com",
        Action = action,
        EntityType = entityType,
        EntityId = "1",
        Summary = summary ?? $"Summary {marker}",
        IpAddress = "127.0.0.1",
        DeviceInfo = "test",
        Timestamp = timestamp ?? DateTime.UtcNow
    };

    private static SystemLog Log(string marker, string level = "Error", string? message = null, string? path = null,
        DateTime? timestamp = null) => new()
    {
        Level = level,
        Message = message ?? $"Message {marker}",
        Path = path,
        Timestamp = timestamp ?? DateTime.UtcNow
    };

    private async Task<JsonElement> GetAsync(string url)
    {
        var res = await _factory.Admin.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static List<string> Strings(JsonElement page, string property) =>
        page.GetProperty("items").EnumerateArray().Select(i => i.GetProperty(property).GetString()!).ToList();

    // ---- activity --------------------------------------------------------------------------

    [Fact]
    public async Task Activity_Search_Matches_Summary_Case_Insensitively_And_Escapes_Wildcards()
    {
        var marker = NewMarker();
        await SeedAsync(activity: new[]
        {
            Activity(marker, summary: $"saved {marker}"),
            Activity(marker, summary: $"50% done {marker}"),
            Activity(marker, summary: "unrelated")
        });

        var page = await GetAsync($"/api/admin/activity?{Search(marker.ToUpperInvariant())}");
        Assert.Equal(2, page.GetProperty("totalCount").GetInt32());

        var percent = await GetAsync($"/api/admin/activity?search={Uri.EscapeDataString("50% done " + marker)}");
        Assert.Equal(1, percent.GetProperty("totalCount").GetInt32());

        var wildcard = await GetAsync($"/api/admin/activity?search={Uri.EscapeDataString("%" + marker)}");
        Assert.Equal(0, wildcard.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Activity_Filters_By_Action_And_EntityType()
    {
        var marker = NewMarker();
        await SeedAsync(activity: new[]
        {
            Activity(marker, action: "A_ONE", entityType: "Project"),
            Activity(marker, action: "A_ONE", entityType: "Skill"),
            Activity(marker, action: "A_TWO", entityType: "Project")
        });

        var byAction = await GetAsync($"/api/admin/activity?{Search(marker)}&action=A_ONE");
        Assert.Equal(2, byAction.GetProperty("totalCount").GetInt32());

        var both = await GetAsync($"/api/admin/activity?{Search(marker)}&action=A_ONE&entityType=Project");
        Assert.Equal(1, both.GetProperty("totalCount").GetInt32());

        var all = await GetAsync($"/api/admin/activity?{Search(marker)}");
        Assert.Contains("A_TWO", all.GetProperty("actions").EnumerateArray().Select(a => a.GetString()));
        Assert.Contains("Skill", all.GetProperty("entityTypes").EnumerateArray().Select(a => a.GetString()));
    }

    [Fact]
    public async Task Activity_Filters_By_Date_Range()
    {
        var marker = NewMarker();
        var day = new DateTime(2001, 5, 10, 12, 0, 0, DateTimeKind.Utc);
        await SeedAsync(activity: new[]
        {
            Activity(marker, summary: $"inside {marker}", timestamp: day),
            Activity(marker, summary: $"before {marker}", timestamp: day.AddDays(-5)),
            Activity(marker, summary: $"after {marker}", timestamp: day.AddDays(5))
        });

        var from = Uri.EscapeDataString("2001-05-10T00:00:00Z");
        var to = Uri.EscapeDataString("2001-05-11T00:00:00Z");
        var page = await GetAsync($"/api/admin/activity?{Search(marker)}&from={from}&to={to}");

        Assert.Equal(1, page.GetProperty("totalCount").GetInt32());
        Assert.Equal($"inside {marker}", Strings(page, "summary").Single());
    }

    [Fact]
    public async Task Activity_Pages_Newest_First_And_Past_The_End_Is_Empty()
    {
        var marker = NewMarker();
        var now = DateTime.UtcNow;
        await SeedAsync(activity: Enumerable.Range(0, 12)
            .Select(i => Activity(marker, summary: $"{marker} #{i:D2}", timestamp: now.AddMinutes(-i))));

        var first = await GetAsync($"/api/admin/activity?{Search(marker)}&page=1&pageSize=10");
        Assert.Equal(12, first.GetProperty("totalCount").GetInt32());
        Assert.Equal(10, first.GetProperty("items").GetArrayLength());
        Assert.EndsWith("#00", Strings(first, "summary").First());

        var second = await GetAsync($"/api/admin/activity?{Search(marker)}&page=2&pageSize=10");
        Assert.Equal(2, second.GetProperty("items").GetArrayLength());

        var beyond = await GetAsync($"/api/admin/activity?{Search(marker)}&page=9&pageSize=10");
        Assert.Equal(0, beyond.GetProperty("items").GetArrayLength());
        Assert.Equal(12, beyond.GetProperty("totalCount").GetInt32());
    }

    [Theory]
    [InlineData("pageSize=15")]
    [InlineData("page=0")]
    [InlineData("from=2020-01-02T00:00:00Z&to=2020-01-01T00:00:00Z")]
    public async Task Activity_Invalid_Query_Is_A_400(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/admin/activity?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // ---- system logs -----------------------------------------------------------------------

    [Fact]
    public async Task SystemLogs_Search_Matches_Message_And_Path()
    {
        var marker = NewMarker();
        await SeedAsync(system: new[]
        {
            Log(marker),
            Log(marker, message: "by path", path: $"/api/{marker}"),
            Log(marker, message: "nothing")
        });

        var page = await GetAsync($"/api/admin/system-logs?{Search(marker)}");
        Assert.Equal(2, page.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task SystemLogs_Filter_By_Level_And_Counts_Ignore_Filters()
    {
        var marker = NewMarker();
        await SeedAsync(system: new[]
        {
            Log(marker, level: "Error"),
            Log(marker, level: "Error"),
            Log(marker, level: "Warning"),
            Log(marker, level: "Information")
        });

        var errors = await GetAsync($"/api/admin/system-logs?{Search(marker)}&level=error");
        Assert.Equal(2, errors.GetProperty("totalCount").GetInt32());
        Assert.All(Strings(errors, "level"), l => Assert.Equal("Error", l));

        // Counts cover all logs, not just the filtered ones, so they are at least what we seeded.
        Assert.True(errors.GetProperty("errorCount").GetInt32() >= 2);
        Assert.True(errors.GetProperty("warningCount").GetInt32() >= 1);
        Assert.True(errors.GetProperty("informationCount").GetInt32() >= 1);
    }

    [Fact]
    public async Task SystemLogs_Filter_By_Date_Range_And_Page()
    {
        var marker = NewMarker();
        var day = new DateTime(2002, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        await SeedAsync(system: Enumerable.Range(0, 12)
            .Select(i => Log(marker, message: $"{marker} #{i:D2}", timestamp: day.AddMinutes(-i)))
            .Append(Log(marker, message: $"{marker} outside", timestamp: day.AddDays(30))));

        var from = Uri.EscapeDataString("2002-06-01T00:00:00Z");
        var to = Uri.EscapeDataString("2002-06-02T00:00:00Z");
        var page = await GetAsync($"/api/admin/system-logs?{Search(marker)}&from={from}&to={to}&page=2&pageSize=10");

        Assert.Equal(12, page.GetProperty("totalCount").GetInt32());
        Assert.Equal(2, page.GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("level=Debug")]
    [InlineData("pageSize=7")]
    [InlineData("page=-1")]
    public async Task SystemLogs_Invalid_Query_Is_A_400(string query)
    {
        var res = await _factory.Admin.GetAsync($"/api/admin/system-logs?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
