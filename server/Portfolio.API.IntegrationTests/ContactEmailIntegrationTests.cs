using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;
using Portfolio.API.Infrastructure.Email;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// Contact messages and repo access requests end to end, with a fake email sender in place of Resend.
/// Each test builds its own host, so the per-IP rate limits (3 per 10 minutes) never carry over between tests.
/// Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class ContactEmailIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ContactEmailIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private sealed class FakeEmailSender : IEmailSender
    {
        public ConcurrentQueue<EmailMessage> Sent { get; } = new();
        public bool Throw { get; set; }

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            if (Throw)
            {
                throw new EmailSendException("provider is down");
            }

            Sent.Enqueue(message);
            return Task.CompletedTask;
        }
    }

    private WebApplicationFactory<Program> CreateHost(FakeEmailSender fake) =>
        _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Resend:OwnerEmail"] = "owner@example.com",
                    ["Resend:FromAddress"] = "hello@example.com",
                    ["Resend:NotifyFromAddress"] = "contact@example.com",
                    ["Resend:FromName"] = "Adnan Bin Farook",
                    ["Resend:SubjectPrefix"] = "[Test] "
                }));
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IEmailSender>();
                services.AddSingleton<IEmailSender>(fake);
            });
        });

    private static string UniqueEmail() => $"visitor-{Guid.NewGuid():N}@example.com";

    private static async Task<string> SeedProjectAsync(WebApplicationFactory<Program> host, bool isPublished, bool isRepoPrivate)
    {
        var slug = $"proj-{Guid.NewGuid():N}";
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Projects.Add(new Project
        {
            Slug = slug,
            Title = "Secret Project",
            IsPublished = isPublished,
            IsRepoPrivate = isRepoPrivate,
            GithubUrl = "https://github.com/example/secret"
        });
        await db.SaveChangesAsync();
        return slug;
    }

    private static async Task<ContactInquiry> FindInquiryAsync(WebApplicationFactory<Program> host, string email)
    {
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ContactInquiries.AsNoTracking().SingleAsync(i => i.Email == email);
    }

    [Fact]
    public async Task Contact_Message_Is_Saved_Then_Owner_And_Visitor_Are_Emailed()
    {
        var fake = new FakeEmailSender();
        using var host = CreateHost(fake);
        var client = host.CreateClient();
        var email = UniqueEmail();

        var res = await client.PostAsJsonAsync("/api/contact", new
        {
            name = "Jane Visitor",
            email,
            subject = "Project idea",
            message = "Hello, I would like to talk."
        });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var inquiry = await FindInquiryAsync(host, email);
        Assert.Equal(ContactInquiryTypes.Contact, inquiry.Type);
        Assert.Null(inquiry.ProjectId);

        Assert.Equal(2, fake.Sent.Count);
        var owner = fake.Sent.Single(m => m.To == "owner@example.com");
        Assert.Equal("Portfolio <contact@example.com>", owner.From);
        Assert.Equal(email, owner.ReplyTo);
        Assert.Equal("[Test] [Portfolio] Project idea", owner.Subject);

        var ack = fake.Sent.Single(m => m.To == email);
        Assert.Equal("Adnan Bin Farook <hello@example.com>", ack.From);
        Assert.Null(ack.ReplyTo);
        Assert.Equal("[Test] Thanks for getting in touch", ack.Subject);
        Assert.DoesNotContain("Jane Visitor", ack.Html + ack.Text);
    }

    [Fact]
    public async Task Contact_Message_Is_Still_Saved_When_The_Email_Provider_Fails()
    {
        var fake = new FakeEmailSender { Throw = true };
        using var host = CreateHost(fake);
        var client = host.CreateClient();
        var email = UniqueEmail();

        var res = await client.PostAsJsonAsync("/api/contact", new
        {
            name = "Jane Visitor",
            email,
            subject = "Hello",
            message = "Anyone there?"
        });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var inquiry = await FindInquiryAsync(host, email);
        Assert.Equal("unread", inquiry.Status);
        Assert.Empty(fake.Sent);
    }

    [Fact]
    public async Task Repo_Request_For_A_Private_Project_Is_Tagged_And_Both_Emails_Are_Sent()
    {
        var fake = new FakeEmailSender();
        using var host = CreateHost(fake);
        var slug = await SeedProjectAsync(host, isPublished: true, isRepoPrivate: true);
        var client = host.CreateClient();
        var email = UniqueEmail();

        var res = await client.PostAsJsonAsync($"/api/projects/{slug}/access-requests", new
        {
            name = "Jane Visitor",
            email,
            message = "May I see the code please?"
        });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var inquiry = await FindInquiryAsync(host, email);
        Assert.Equal(ContactInquiryTypes.RepoRequest, inquiry.Type);
        Assert.NotNull(inquiry.ProjectId);
        Assert.Equal("Request access: Secret Project", inquiry.Subject);

        Assert.Equal(2, fake.Sent.Count);
        var owner = fake.Sent.Single(m => m.To == "owner@example.com");
        Assert.Equal("[Test] [Repo request] Secret Project", owner.Subject);
        Assert.Equal(email, owner.ReplyTo);

        var ack = fake.Sent.Single(m => m.To == email);
        Assert.Equal("[Test] Your repository access request", ack.Subject);
        Assert.Contains("Secret Project", ack.Html);
    }

    [Fact]
    public async Task Repo_Request_Returns_404_For_Draft_And_Unknown_Projects()
    {
        var fake = new FakeEmailSender();
        using var host = CreateHost(fake);
        var draftSlug = await SeedProjectAsync(host, isPublished: false, isRepoPrivate: true);
        var client = host.CreateClient();
        var body = new { name = "Jane", email = UniqueEmail(), message = "Please share access." };

        var draft = await client.PostAsJsonAsync($"/api/projects/{draftSlug}/access-requests", body);
        var unknown = await client.PostAsJsonAsync("/api/projects/does-not-exist/access-requests", body);

        Assert.Equal(HttpStatusCode.NotFound, draft.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Empty(fake.Sent);
    }

    [Fact]
    public async Task Repo_Request_Returns_400_When_The_Repository_Is_Not_Private()
    {
        var fake = new FakeEmailSender();
        using var host = CreateHost(fake);
        var slug = await SeedProjectAsync(host, isPublished: true, isRepoPrivate: false);
        var client = host.CreateClient();

        var res = await client.PostAsJsonAsync($"/api/projects/{slug}/access-requests", new
        {
            name = "Jane",
            email = UniqueEmail(),
            message = "Please share access."
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Empty(fake.Sent);
    }

    [Fact]
    public async Task Admin_Inbox_Shows_The_Type_And_Project_Of_A_Repo_Request()
    {
        var fake = new FakeEmailSender();
        using var host = CreateHost(fake);
        var slug = await SeedProjectAsync(host, isPublished: true, isRepoPrivate: true);
        var email = UniqueEmail();

        var visitor = host.CreateClient();
        var submit = await visitor.PostAsJsonAsync($"/api/projects/{slug}/access-requests", new
        {
            name = "Jane",
            email,
            message = "Please share access."
        });
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);

        var admin = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("http://localhost:5065")
        });
        var login = await admin.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = CustomWebApplicationFactory.AdminEmail,
            Password = CustomWebApplicationFactory.AdminPassword
        });
        login.EnsureSuccessStatusCode();

        var inquiries = await admin.GetFromJsonAsync<JsonElement>("/api/contact/inquiries");
        var item = inquiries.EnumerateArray().Single(i => i.GetProperty("email").GetString() == email);

        Assert.Equal("repo_request", item.GetProperty("type").GetString());
        Assert.Equal("Secret Project", item.GetProperty("projectTitle").GetString());
        Assert.Equal(slug, item.GetProperty("projectSlug").GetString());
    }
}
