using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

public class DraftVisibilityTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public DraftVisibilityTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateAnonymousClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false,
            BaseAddress = new Uri("http://localhost:5065")
        });

    private async Task<HttpClient> CreateAdminClientAsync()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost:5065")
        });

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.AdminEmail,
            Password = CustomWebApplicationFactory.AdminPassword
        });
        login.EnsureSuccessStatusCode();
        return client;
    }

    // Unique slugs keep tests independent: the output cache and database are shared per factory.
    private async Task<string> SeedDraftPostAsync()
    {
        var slug = $"draft-post-{Guid.NewGuid():N}";
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.BlogPosts.Add(new BlogPost { Slug = slug, Title = "Draft post", IsPublished = false });
        await db.SaveChangesAsync();
        return slug;
    }

    private async Task<string> SeedDraftProjectAsync()
    {
        var slug = $"draft-project-{Guid.NewGuid():N}";
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Projects.Add(new Project { Slug = slug, Title = "Draft project", IsPublished = false });
        await db.SaveChangesAsync();
        return slug;
    }

    [Fact]
    public async Task Anonymous_Cannot_List_Blog_Drafts_Even_With_IncludeDrafts()
    {
        var slug = await SeedDraftPostAsync();
        var client = CreateAnonymousClient();

        var res = await client.GetAsync("/api/blog?includeDrafts=true");
        var body = await res.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.DoesNotContain(slug, body);
    }

    [Fact]
    public async Task Anonymous_Gets_404_For_Draft_Blog_Post()
    {
        var slug = await SeedDraftPostAsync();
        var client = CreateAnonymousClient();

        var res = await client.GetAsync($"/api/blog/{slug}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Admin_Can_Read_Draft_Blog_Post()
    {
        var slug = await SeedDraftPostAsync();
        var admin = await CreateAdminClientAsync();

        var res = await admin.GetAsync($"/api/blog/{slug}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Admin_Draft_Project_Response_Is_Not_Served_To_Anonymous_From_Cache()
    {
        var slug = await SeedDraftProjectAsync();
        var admin = await CreateAdminClientAsync();
        var anonymous = CreateAnonymousClient();

        // Admin goes first, so a cacheable admin response would be stored here.
        var adminRes = await admin.GetAsync($"/api/projects/{slug}");
        Assert.Equal(HttpStatusCode.OK, adminRes.StatusCode);

        var anonRes = await anonymous.GetAsync($"/api/projects/{slug}");
        Assert.Equal(HttpStatusCode.NotFound, anonRes.StatusCode);
    }

    [Fact]
    public async Task Admin_Draft_Project_List_Is_Not_Served_To_Anonymous_From_Cache()
    {
        var slug = await SeedDraftProjectAsync();
        var admin = await CreateAdminClientAsync();
        var anonymous = CreateAnonymousClient();

        var adminBody = await (await admin.GetAsync("/api/projects?includeDrafts=true")).Content.ReadAsStringAsync();
        Assert.Contains(slug, adminBody);

        var anonBody = await (await anonymous.GetAsync("/api/projects?includeDrafts=true")).Content.ReadAsStringAsync();
        Assert.DoesNotContain(slug, anonBody);
    }
}
