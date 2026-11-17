namespace Portfolio.API.Infrastructure.Email;

/// <summary>One outgoing email. <see cref="From"/> may include a display name, e.g. "Name &lt;a@b.com&gt;".</summary>
public record EmailMessage(
    string From,
    string To,
    string Subject,
    string Html,
    string Text,
    string? ReplyTo = null,
    string? IdempotencyKey = null);

/// <summary>
/// Sends email. Features depend on this interface only, so the provider (Resend today)
/// can be replaced without touching them. Implementations throw <see cref="EmailSendException"/> on failure.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public class EmailSendException : Exception
{
    public EmailSendException(string message, Exception? inner = null) : base(message, inner)
    {
    }
}
