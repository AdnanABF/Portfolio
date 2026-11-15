using System.Net;
using Portfolio.API.Features.Contact;

namespace Portfolio.API.Features.Auth;

/// <summary>
/// Wording of the account emails: invite, email verification and password reset. The member's name is
/// HTML-encoded in the HTML body and stripped of line breaks in plain text, so a name cannot inject markup.
/// The link is built by the server and contains only ids and tokens.
/// </summary>
public static class AccountEmailTemplates
{
    private const string OwnerName = "Adnan Bin Farook";

    public static EmailContent Invite(string name, string link) => Build(
        "You're invited to join",
        name,
        "You've been invited to create an account on my portfolio site. Use the button below to set your password and activate it.",
        "Set my password",
        link,
        "This link works for 3 days. If you weren't expecting this invitation, you can ignore this email.");

    public static EmailContent VerifyEmail(string name, string link) => Build(
        "Confirm your email address",
        name,
        "Thanks for signing up. Please confirm your email address to activate your account.",
        "Confirm my email",
        link,
        "This link works for 3 days. If you didn't sign up, you can ignore this email.");

    public static EmailContent ResetPassword(string name, string link) => Build(
        "Reset your password",
        name,
        "We received a request to reset your password. Use the button below to choose a new one.",
        "Reset my password",
        link,
        "This link works for 3 days. If you didn't ask for this, you can ignore this email and your password stays the same.");

    private static EmailContent Build(string subject, string name, string intro, string action, string link, string footer)
    {
        var greetingName = ContactEmailTemplates.SingleLine(name, 100);
        var greeting = string.IsNullOrWhiteSpace(greetingName) ? "Hi," : $"Hi {greetingName},";

        var text =
            greeting + "\n\n" +
            intro + "\n\n" +
            action + ": " + link + "\n\n" +
            footer + "\n\n" +
            "Best regards,\n" + OwnerName;

        var html = Wrap(
            $"<p>{WebUtility.HtmlEncode(greeting)}</p>" +
            $"<p>{WebUtility.HtmlEncode(intro)}</p>" +
            $"<p><a href=\"{WebUtility.HtmlEncode(link)}\" style=\"display:inline-block;padding:10px 18px;" +
            $"background:#222;color:#fff;text-decoration:none;border-radius:6px\">{WebUtility.HtmlEncode(action)}</a></p>" +
            $"<p style=\"color:#666;font-size:13px\">Or paste this link into your browser:<br>{WebUtility.HtmlEncode(link)}</p>" +
            $"<p style=\"color:#666;font-size:13px\">{WebUtility.HtmlEncode(footer)}</p>" +
            $"<p>Best regards,<br>{OwnerName}</p>");

        return new EmailContent(subject, html, text);
    }

    private static string Wrap(string bodyHtml) =>
        "<!doctype html><html><body style=\"margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;" +
        "color:#222;line-height:1.5\"><div style=\"max-width:560px\">" + bodyHtml + "</div></body></html>";
}
