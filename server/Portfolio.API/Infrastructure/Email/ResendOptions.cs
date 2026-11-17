namespace Portfolio.API.Infrastructure.Email;

/// <summary>
/// Settings for outgoing email, bound from the "Resend" configuration section.
/// Values come from appsettings.Development.json (git-ignored) locally and from environment
/// variables (Resend__ApiKey, Resend__FromAddress, ...) in staging and production. Never commit real values.
/// </summary>
public class ResendOptions
{
    public const string SectionName = "Resend";

    /// <summary>Resend API key. Empty means "log emails to the console" (Development only).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Sender of acknowledgement emails to visitors, for example hello@yourdomain.</summary>
    public string FromAddress { get; set; } = string.Empty;

    /// <summary>Sender of notification emails to the owner, for example contact@yourdomain.</summary>
    public string NotifyFromAddress { get; set; } = string.Empty;

    /// <summary>Display name shown next to the sender address.</summary>
    public string FromName { get; set; } = string.Empty;

    /// <summary>Where owner notifications are delivered.</summary>
    public string OwnerEmail { get; set; } = string.Empty;

    /// <summary>Switch for the acknowledgement email sent to the visitor.</summary>
    public bool SendAutoReply { get; set; } = true;

    /// <summary>Text put in front of every subject, for example "[Staging] ". Empty in production.</summary>
    public string SubjectPrefix { get; set; } = string.Empty;
}
