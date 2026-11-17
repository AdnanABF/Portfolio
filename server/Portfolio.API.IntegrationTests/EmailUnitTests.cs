using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Contact;
using Portfolio.API.Infrastructure.Email;

namespace Portfolio.API.IntegrationTests;

/// <summary>Email tests that need no database: wording, the Resend request, and startup rules.</summary>
public class EmailUnitTests
{
    private static ContactInquiry Inquiry(string name = "Jane", string subject = "Hello", string message = "Hi there") => new()
    {
        Name = name,
        Email = "jane@example.com",
        Subject = subject,
        Message = message,
        CreatedAt = new DateTime(2026, 11, 13, 9, 30, 0, DateTimeKind.Utc)
    };

    // ---- templates -------------------------------------------------------------------------

    [Fact]
    public void OwnerNotification_Encodes_Html_From_The_Visitor()
    {
        var inquiry = Inquiry(name: "<b>Eve</b>", message: "<script>alert(1)</script>\nsecond line");

        var content = ContactEmailTemplates.ContactOwnerNotification(inquiry);

        Assert.DoesNotContain("<script>", content.Html);
        Assert.DoesNotContain("<b>Eve</b>", content.Html);
        Assert.Contains("&lt;script&gt;", content.Html);
        Assert.Contains("second line", content.Html);
        Assert.Contains("<br>", content.Html);
    }

    [Fact]
    public void Subjects_Cannot_Contain_Line_Breaks()
    {
        var inquiry = Inquiry(subject: "Hi\r\nBcc: attacker@example.com");

        var content = ContactEmailTemplates.ContactOwnerNotification(inquiry);

        Assert.DoesNotContain('\r', content.Subject);
        Assert.DoesNotContain('\n', content.Subject);
        Assert.StartsWith("[Portfolio] ", content.Subject);
    }

    [Fact]
    public void Acknowledgements_Contain_No_Visitor_Text()
    {
        var content = ContactEmailTemplates.ContactAcknowledgement();

        Assert.DoesNotContain("Jane", content.Html + content.Text);
        Assert.Equal("Thanks for getting in touch", content.Subject);
    }

    [Fact]
    public void RepoRequest_Emails_Use_The_Project_Title_And_Tag()
    {
        var inquiry = Inquiry();

        var owner = ContactEmailTemplates.RepoRequestOwnerNotification(inquiry, "Grama<Hub>");
        var ack = ContactEmailTemplates.RepoRequestAcknowledgement("Grama<Hub>");

        Assert.Equal("[Repo request] Grama<Hub>", owner.Subject);
        Assert.Contains("Grama&lt;Hub&gt;", owner.Html);
        Assert.DoesNotContain("Grama<Hub>", owner.Html);
        Assert.Contains("Grama&lt;Hub&gt;", ack.Html);
        Assert.Equal("Your repository access request", ack.Subject);
    }

    [Fact]
    public void SingleLine_Removes_Control_Characters_And_Limits_Length()
    {
        Assert.Equal("a b c", ContactEmailTemplates.SingleLine("a\r\nb\tc", 50));
        Assert.Equal("abc", ContactEmailTemplates.SingleLine("abcdef", 3));
        Assert.Equal(string.Empty, ContactEmailTemplates.SingleLine(null, 10));
    }

    // ---- Resend sender ---------------------------------------------------------------------

    private sealed class StubHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }
        public Func<HttpResponseMessage> Respond { get; set; } = () => new HttpResponseMessage(HttpStatusCode.OK);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            Body = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return Respond();
        }
    }

    private static ResendEmailSender CreateSender(StubHandler handler) =>
        new(new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") },
            Options.Create(new ResendOptions { ApiKey = "re_test_key" }));

    private static EmailMessage Message() => new(
        From: "Adnan <hello@example.com>",
        To: "jane@example.com",
        Subject: "Hello",
        Html: "<p>Hi</p>",
        Text: "Hi",
        ReplyTo: "visitor@example.com",
        IdempotencyKey: "inquiry-1-owner");

    [Fact]
    public async Task ResendSender_Posts_The_Expected_Request()
    {
        var handler = new StubHandler();
        var sender = CreateSender(handler);

        await sender.SendAsync(Message());

        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("https://api.resend.com/emails", handler.Request.RequestUri!.ToString());
        Assert.Equal("Bearer", handler.Request.Headers.Authorization!.Scheme);
        Assert.Equal("re_test_key", handler.Request.Headers.Authorization.Parameter);
        Assert.Equal("inquiry-1-owner", handler.Request.Headers.GetValues("Idempotency-Key").Single());

        using var json = JsonDocument.Parse(handler.Body!);
        var root = json.RootElement;
        Assert.Equal("Adnan <hello@example.com>", root.GetProperty("from").GetString());
        Assert.Equal("jane@example.com", root.GetProperty("to")[0].GetString());
        Assert.Equal("Hello", root.GetProperty("subject").GetString());
        Assert.Equal("<p>Hi</p>", root.GetProperty("html").GetString());
        Assert.Equal("Hi", root.GetProperty("text").GetString());
        Assert.Equal("visitor@example.com", root.GetProperty("reply_to").GetString());
    }

    [Fact]
    public async Task ResendSender_Omits_ReplyTo_When_Not_Set()
    {
        var handler = new StubHandler();
        var sender = CreateSender(handler);

        await sender.SendAsync(Message() with { ReplyTo = null });

        using var json = JsonDocument.Parse(handler.Body!);
        Assert.False(json.RootElement.TryGetProperty("reply_to", out _));
    }

    [Fact]
    public async Task ResendSender_Throws_When_The_Provider_Rejects_The_Email()
    {
        var handler = new StubHandler
        {
            Respond = () => new HttpResponseMessage(HttpStatusCode.UnprocessableEntity)
            {
                Content = new StringContent("{\"message\":\"The from address is not verified\"}")
            }
        };
        var sender = CreateSender(handler);

        var ex = await Assert.ThrowsAsync<EmailSendException>(() => sender.SendAsync(Message()));

        Assert.Contains("422", ex.Message);
        Assert.Contains("not verified", ex.Message);
    }

    [Fact]
    public async Task ResendSender_Wraps_Network_Failures()
    {
        var handler = new StubHandler { Respond = () => throw new HttpRequestException("boom") };
        var sender = CreateSender(handler);

        await Assert.ThrowsAsync<EmailSendException>(() => sender.SendAsync(Message()));
    }

    // ---- startup rules ---------------------------------------------------------------------

    private sealed class FakeEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static IConfiguration Config(params (string Key, string Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.ToDictionary(v => v.Key, v => (string?)v.Value))
            .Build();

    [Fact]
    public void Startup_Fails_Outside_Development_When_Email_Settings_Are_Missing()
    {
        var services = new ServiceCollection();

        var ex = Assert.Throws<InvalidOperationException>(() =>
            services.AddEmailSending(Config(), new FakeEnvironment("Production")));

        Assert.Contains("Resend:ApiKey", ex.Message);
        Assert.Contains("Resend:OwnerEmail", ex.Message);
    }

    [Fact]
    public void Development_Without_A_Key_Uses_The_Logging_Sender()
    {
        var services = new ServiceCollection();
        services.AddLogging();

        services.AddEmailSending(Config(), new FakeEnvironment("Development"));

        using var provider = services.BuildServiceProvider();
        Assert.IsType<LoggingEmailSender>(provider.GetRequiredService<IEmailSender>());
    }

    [Fact]
    public void A_Key_Selects_The_Resend_Sender_And_Binds_Options()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        var config = Config(
            ("Resend:ApiKey", "re_key"),
            ("Resend:FromAddress", "hello@example.com"),
            ("Resend:NotifyFromAddress", "contact@example.com"),
            ("Resend:OwnerEmail", "owner@example.com"),
            ("Resend:SubjectPrefix", "[Staging] "));

        services.AddEmailSending(config, new FakeEnvironment("Production"));

        using var provider = services.BuildServiceProvider();
        Assert.IsType<ResendEmailSender>(provider.GetRequiredService<IEmailSender>());
        var options = provider.GetRequiredService<IOptions<ResendOptions>>().Value;
        Assert.Equal("owner@example.com", options.OwnerEmail);
        Assert.Equal("[Staging] ", options.SubjectPrefix);
        Assert.True(options.SendAutoReply);
    }
}
