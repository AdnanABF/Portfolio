namespace Portfolio.API.Infrastructure.Email;

/// <summary>
/// Development-only sender used when no API key is configured: writes the email to the log
/// instead of sending it, so local runs need no key and never send real mail.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Email not sent (no Resend API key). From: {From} | To: {To} | Reply-To: {ReplyTo} | Subject: {Subject}\n{Text}",
            message.From, message.To, message.ReplyTo ?? "-", message.Subject, message.Text);
        return Task.CompletedTask;
    }
}
