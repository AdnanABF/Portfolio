using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Portfolio.API.Features.Auth;
using Portfolio.API.Features.Homepage;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// The editable home page: a draft that is saved and previewed, then published; who may edit; what the content
/// may contain; and the hidden/visible flag and ordering of skills and experience. The tests leave the content
/// as they found it. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class HomepageContentTests : IClassFixture<MembersFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly MembersFactory _factory;
    private HomepageContent _original = new();

    public HomepageContentTests(MembersFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _original = await GetPublishedAsync();
    }

    /// <summary>Puts the original content back as both draft and published, so reruns start clean.</summary>
    public async Task DisposeAsync()
    {
        await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", _original);
        await _factory.Admin.PostAsync("/api/admin/site-content/publish", null);
    }

    private async Task<HomepageContent> GetPublishedAsync()
    {
        var res = await _factory.NewClient().GetAsync("/api/site-content");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<HomepageContent>(Json))!;
    }

    private async Task<SiteContentAdminDto> GetAdminAsync()
    {
        var res = await _factory.Admin.GetAsync("/api/admin/site-content");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<SiteContentAdminDto>(Json))!;
    }

    /// <summary>A valid copy of the original content with the hero title changed to <paramref name="headline"/>.</summary>
    private HomepageContent WithHeadline(string headline)
    {
        var copy = JsonSerializer.Deserialize<HomepageContent>(JsonSerializer.Serialize(_original, Json), Json)!;
        copy.Profile.Headline = headline;
        return copy;
    }

    // ---- who can do what ------------------------------------------------------------------------

    [Fact]
    public async Task Published_Content_Is_Readable_By_Anyone_And_Has_Every_Section()
    {
        var content = await GetPublishedAsync();

        Assert.False(string.IsNullOrWhiteSpace(content.Profile.Name));
        Assert.Equal(HomepageContentRules.SectionIds.OrderBy(x => x), content.Sections.Select(s => s.Id).OrderBy(x => x));
    }

    [Fact]
    public async Task Editing_Needs_An_Admin()
    {
        var anonymous = _factory.NewClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/site-content")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync("/api/admin/site-content", _original)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/admin/site-content/publish", null)).StatusCode);

        var member = _factory.NewClient();
        var login = await member.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.RegularUserEmail,
            Password = CustomWebApplicationFactory.RegularUserPassword
        });
        login.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/admin/site-content")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PutAsJsonAsync("/api/admin/site-content", _original)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsync("/api/admin/site-content/publish", null)).StatusCode);
    }

    // ---- draft and publish ----------------------------------------------------------------------

    [Fact]
    public async Task A_Saved_Draft_Stays_Private_Until_It_Is_Published()
    {
        var marker = $"Draft title {Guid.NewGuid():N}";

        var save = await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", WithHeadline(marker));
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        var saved = await save.Content.ReadFromJsonAsync<SiteContentAdminDto>(Json);
        Assert.True(saved!.HasUnpublishedChanges);
        Assert.Equal(marker, saved.Draft.Profile.Headline);

        Assert.NotEqual(marker, (await GetPublishedAsync()).Profile.Headline);

        var publish = await _factory.Admin.PostAsync("/api/admin/site-content/publish", null);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        var published = await publish.Content.ReadFromJsonAsync<SiteContentAdminDto>(Json);
        Assert.False(published!.HasUnpublishedChanges);

        // The public response is cached; publishing must clear it.
        Assert.Equal(marker, (await GetPublishedAsync()).Profile.Headline);
    }

    [Fact]
    public async Task Discarding_The_Draft_Goes_Back_To_The_Published_Content()
    {
        var marker = $"Discard me {Guid.NewGuid():N}";
        await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", WithHeadline(marker));
        Assert.True((await GetAdminAsync()).HasUnpublishedChanges);

        var discard = await _factory.Admin.PostAsync("/api/admin/site-content/discard", null);
        Assert.Equal(HttpStatusCode.OK, discard.StatusCode);

        var after = await GetAdminAsync();
        Assert.False(after.HasUnpublishedChanges);
        Assert.NotEqual(marker, after.Draft.Profile.Headline);
    }

    // ---- what the content may contain -----------------------------------------------------------

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,hello")]
    [InlineData("//evil.example/x")]
    [InlineData("http://insecure.example")]
    [InlineData("https://exa mple.com")]
    public async Task Unsafe_Addresses_Are_Refused(string url)
    {
        var content = WithHeadline("Links");
        content.Links.Add(new LinkItem { Label = "Bad", Url = url, Kind = "website" });

        var res = await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Theory]
    [InlineData("https://example.com/page")]
    [InlineData("mailto:someone@example.com")]
    [InlineData("tel:+96560000000")]
    [InlineData("/media/photo.webp")]
    [InlineData("/#projects")]
    public async Task Safe_Addresses_Are_Accepted(string url)
    {
        var content = WithHeadline("Links");
        content.Links.Add(new LinkItem { Label = "Ok", Url = url, Kind = "website" });

        var res = await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Every_Section_Must_Be_Listed_Exactly_Once()
    {
        var missing = WithHeadline("Sections");
        missing.Sections.RemoveAt(0);
        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", missing)).StatusCode);

        var duplicate = WithHeadline("Sections");
        duplicate.Sections[1].Id = duplicate.Sections[0].Id;
        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", duplicate)).StatusCode);
    }

    [Fact]
    public async Task Sections_Can_Be_Reordered_And_Switched_Off()
    {
        var content = WithHeadline("Order");
        content.Sections.Reverse();
        content.Sections.First(s => s.Id == "skills").Enabled = false;

        var res = await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        await _factory.Admin.PostAsync("/api/admin/site-content/publish", null);

        var published = await GetPublishedAsync();
        Assert.Equal(content.Sections.Select(s => s.Id), published.Sections.Select(s => s.Id));
        Assert.False(published.Sections.First(s => s.Id == "skills").Enabled);
    }

    [Fact]
    public async Task About_Cards_Can_Be_Added_Removed_And_Reordered_But_Must_Use_Known_Choices()
    {
        var content = WithHeadline("Cards");
        content.About.Cards.Reverse();
        content.About.Cards.Add(new AboutCard { Title = "New card", Text = "Something new.", Icon = "rocket", Color = "sky", Size = "small" });
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content)).StatusCode);
        Assert.Equal(content.About.Cards.Select(c => c.Title), (await GetAdminAsync()).Draft.About.Cards.Select(c => c.Title));

        content.About.Cards.Clear();
        Assert.Equal(HttpStatusCode.OK, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content)).StatusCode);

        content.About.Cards.Add(new AboutCard { Title = "Bad", Text = "x", Icon = "not-an-icon", Color = "primary", Size = "small" });
        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content)).StatusCode);
    }

    [Fact]
    public async Task Too_Many_Items_Are_Refused()
    {
        var content = WithHeadline("Limits");
        for (var i = 0; i < HomepageContentRules.MaxLinks + 1; i++)
        {
            content.Links.Add(new LinkItem { Label = $"L{i}", Url = "https://example.com", Kind = "website" });
        }

        Assert.Equal(HttpStatusCode.BadRequest, (await _factory.Admin.PutAsJsonAsync("/api/admin/site-content", content)).StatusCode);
    }

    // ---- skills and experience: hidden items and order ------------------------------------------

    private async Task<Guid> CreateSkillAsync(string name, bool visible)
    {
        var res = await _factory.Admin.PostAsJsonAsync("/api/skills",
            new { category = "Test", name, sortOrder = 900, isVisible = visible });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    [Fact]
    public async Task A_Hidden_Skill_Is_Only_Listed_For_Admins_Who_Ask_For_It()
    {
        var name = $"Hidden-{Guid.NewGuid():N}";
        var id = await CreateSkillAsync(name, visible: false);
        try
        {
            var anonymous = _factory.NewClient();
            Assert.DoesNotContain(name, await anonymous.GetStringAsync("/api/skills"));
            // The query string must not let a visitor see hidden items.
            Assert.DoesNotContain(name, await anonymous.GetStringAsync("/api/skills?includeHidden=true"));

            Assert.DoesNotContain(name, await _factory.Admin.GetStringAsync("/api/skills"));
            Assert.Contains(name, await _factory.Admin.GetStringAsync("/api/skills?includeHidden=true"));
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/skills/{id}");
        }
    }

    [Fact]
    public async Task Skills_Can_Be_Reordered()
    {
        var first = await CreateSkillAsync($"A-{Guid.NewGuid():N}", true);
        var second = await CreateSkillAsync($"B-{Guid.NewGuid():N}", true);
        try
        {
            var res = await _factory.Admin.PutAsJsonAsync("/api/skills/order", new { ids = new[] { second, first } });
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

            var list = await _factory.Admin.GetFromJsonAsync<JsonElement>("/api/skills?includeHidden=true");
            var ids = list.EnumerateArray().Select(e => e.GetProperty("id").GetGuid()).ToList();
            Assert.True(ids.IndexOf(second) < ids.IndexOf(first));

            var unknown = await _factory.Admin.PutAsJsonAsync("/api/skills/order", new { ids = new[] { Guid.NewGuid() } });
            Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/skills/{first}");
            await _factory.Admin.DeleteAsync($"/api/skills/{second}");
        }
    }

    [Fact]
    public async Task A_Hidden_Experience_Entry_Is_Only_Listed_For_Admins_Who_Ask_For_It()
    {
        var company = $"Hidden Co {Guid.NewGuid():N}";
        var res = await _factory.Admin.PostAsJsonAsync("/api/experience", new
        {
            role = "Tester", company, location = "Remote", period = "2026", achievements = new[] { "Did a thing" },
            sortOrder = 900, isVisible = false
        });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var id = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        try
        {
            Assert.DoesNotContain(company, await _factory.NewClient().GetStringAsync("/api/experience?includeHidden=true"));
            Assert.Contains(company, await _factory.Admin.GetStringAsync("/api/experience?includeHidden=true"));
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/experience/{id}");
        }
    }
}

/// <summary>The content a new database starts with.</summary>
public class HomepageContentDefaultsTests
{
    [Fact]
    public void The_Starting_Content_Passes_Its_Own_Validation()
    {
        var result = new HomepageContentValidator().Validate(HomepageContentDefaults.Create());

        Assert.True(result.IsValid, string.Join("; ", result.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
    }

    [Fact]
    public void The_Starting_Content_Keeps_Private_Details_Off_The_Public_Site()
    {
        var json = SiteContentService.Serialize(HomepageContentDefaults.Create());

        Assert.DoesNotContain("tel:", json);
        Assert.DoesNotContain("6091", json);
        Assert.DoesNotContain("Visa", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void A_Document_Saved_Before_A_Section_Existed_Gets_That_Section_Added()
    {
        // Stored content from when the page had five sections.
        var old = HomepageContentDefaults.Create();
        old.Sections.RemoveAll(s => s.Id is "education" or "certifications");

        var parsed = SiteContentService.Parse(SiteContentService.Serialize(old));

        Assert.Equal(HomepageContentRules.SectionIds.OrderBy(x => x), parsed.Sections.Select(s => s.Id).OrderBy(x => x));
        Assert.Equal("Education", parsed.Sections.Single(s => s.Id == "education").Label);
        Assert.True(new HomepageContentValidator().Validate(parsed).IsValid);
    }

    [Fact]
    public void Content_Survives_A_Round_Trip_And_Fills_In_Missing_Fields()
    {
        var original = HomepageContentDefaults.Create();
        var again = SiteContentService.Parse(SiteContentService.Serialize(original));
        Assert.Equal(SiteContentService.Serialize(original), SiteContentService.Serialize(again));

        // Older stored JSON without newer fields still loads; the missing ones keep their defaults.
        var sparse = SiteContentService.Parse("{\"profile\":{\"name\":\"Only a name\"}}");
        Assert.Equal("Only a name", sparse.Profile.Name);
        Assert.Equal("Download CV", sparse.Profile.CvButtonLabel);

        // Stored text that is not JSON falls back to the starting content instead of failing.
        Assert.False(string.IsNullOrWhiteSpace(SiteContentService.Parse("not json").Profile.Name));
    }
}

/// <summary>The rule for which addresses the home page content may contain.</summary>
public class HomepageContentUrlRuleTests
{
    [Theory]
    [InlineData("", true)]
    [InlineData("https://example.com", true)]
    [InlineData("HTTPS://EXAMPLE.COM", true)]
    [InlineData("mailto:a@b.co", true)]
    [InlineData("tel:+1234", true)]
    [InlineData("/path/to/file.pdf", true)]
    [InlineData("/#about", true)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html;base64,AAAA", false)]
    [InlineData("//evil.example", false)]
    [InlineData("/\\evil.example", false)]
    [InlineData("http://example.com", false)]
    [InlineData("https://exa mple.com", false)]
    [InlineData("https://example.com/\nx", false)]
    public void Only_Safe_Addresses_Pass(string url, bool expected)
    {
        Assert.Equal(expected, HomepageContentValidator.IsSafeUrl(url));
    }
}
