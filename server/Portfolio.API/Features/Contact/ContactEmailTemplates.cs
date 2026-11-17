using System.Net;
using System.Text;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Contact;

/// <summary>Subject plus HTML and plain-text bodies of one email.</summary>
public record EmailContent(string Subject, string Html, string Text);

/// <summary>
/// Wording of the four emails sent for contact messages and repo access requests.
/// Everything a visitor typed is HTML-encoded in the HTML body, and line breaks are stripped from
/// anything used in a subject, so visitor input cannot inject markup or email headers.
/// Acknowledgements to visitors contain no visitor-supplied text, so the form cannot be used
/// to deliver arbitrary text to a third party's inbox.
/// </summary>
public static class ContactEmailTemplates
{
    private const string OwnerName = "Adnan Bin Farook";

    public static EmailContent ContactAcknowledgement()
    {
        const string text =
            "Hi,\n\n" +
            "Thanks for getting in touch. I've received your message and will get back to you soon.\n\n" +
            "Best regards,\n" + OwnerName + "\n\n" +
            "If you didn't send this message, you can ignore this email.";

        var html = Wrap(
            "<p>Hi,</p>" +
            "<p>Thanks for getting in touch. I've received your message and will get back to you soon.</p>" +
            "<p>Best regards,<br>" + OwnerName + "</p>" +
            "<p style=\"color:#666;font-size:13px\">If you didn't send this message, you can ignore this email.</p>");

        return new EmailContent("Thanks for getting in touch", html, text);
    }

    public static EmailContent RepoRequestAcknowledgement(string projectTitle)
    {
        var title = SingleLine(projectTitle, 200);

        var text =
            "Hi,\n\n" +
            $"Thanks for your interest in the source code for \"{title}\". " +
            "I've received your access request and will review it. I'll reply by email once I've decided.\n\n" +
            "Best regards,\n" + OwnerName + "\n\n" +
            "If you didn't send this request, you can ignore this email.";

        var html = Wrap(
            "<p>Hi,</p>" +
            $"<p>Thanks for your interest in the source code for <strong>&ldquo;{Encode(title)}&rdquo;</strong>. " +
            "I've received your access request and will review it. I'll reply by email once I've decided.</p>" +
            "<p>Best regards,<br>" + OwnerName + "</p>" +
            "<p style=\"color:#666;font-size:13px\">If you didn't send this request, you can ignore this email.</p>");

        return new EmailContent("Your repository access request", html, text);
    }

    public static EmailContent ContactOwnerNotification(ContactInquiry inquiry)
    {
        var subject = $"[Portfolio] {SingleLine(inquiry.Subject, 150)}";

        var text = new StringBuilder()
            .AppendLine("New message from the contact form")
            .AppendLine()
            .AppendLine($"From:     {SingleLine(inquiry.Name, 100)} <{SingleLine(inquiry.Email, 150)}>")
            .AppendLine($"Subject:  {SingleLine(inquiry.Subject, 200)}")
            .AppendLine($"Received: {Received(inquiry)}")
            .AppendLine()
            .AppendLine(inquiry.Message)
            .ToString();

        var html = Wrap(
            "<p><strong>New message from the contact form</strong></p>" +
            DetailsTable(
                ("From", $"{Encode(SingleLine(inquiry.Name, 100))} &lt;{Encode(SingleLine(inquiry.Email, 150))}&gt;"),
                ("Subject", Encode(SingleLine(inquiry.Subject, 200))),
                ("Received", Received(inquiry))) +
            MessageBlock(inquiry.Message) +
            "<p style=\"color:#666;font-size:13px\">Press Reply to answer the sender directly.</p>");

        return new EmailContent(subject, html, text);
    }

    public static EmailContent RepoRequestOwnerNotification(ContactInquiry inquiry, string projectTitle)
    {
        var title = SingleLine(projectTitle, 200);
        var subject = $"[Repo request] {title}";

        var text = new StringBuilder()
            .AppendLine("New repo access request")
            .AppendLine()
            .AppendLine($"Project:  {title}")
            .AppendLine($"From:     {SingleLine(inquiry.Name, 100)} <{SingleLine(inquiry.Email, 150)}>")
            .AppendLine($"Received: {Received(inquiry)}")
            .AppendLine()
            .AppendLine(inquiry.Message)
            .ToString();

        var html = Wrap(
            "<p><strong>New repo access request</strong></p>" +
            DetailsTable(
                ("Project", Encode(title)),
                ("From", $"{Encode(SingleLine(inquiry.Name, 100))} &lt;{Encode(SingleLine(inquiry.Email, 150))}&gt;"),
                ("Received", Received(inquiry))) +
            MessageBlock(inquiry.Message) +
            "<p style=\"color:#666;font-size:13px\">Press Reply to answer the requester directly.</p>");

        return new EmailContent(subject, html, text);
    }

    /// <summary>Collapses a value to one line (no CR/LF or control characters) and limits its length.</summary>
    public static string SingleLine(string? value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            builder.Append(char.IsControl(c) ? ' ' : c);
        }

        // Several spaces (for example from a CR+LF pair) collapse into one.
        var cleaned = System.Text.RegularExpressions.Regex.Replace(builder.ToString(), @"\s+", " ").Trim();
        return cleaned.Length > maxLength ? cleaned[..maxLength] : cleaned;
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);

    private static string Received(ContactInquiry inquiry) =>
        inquiry.CreatedAt.ToString("yyyy-MM-dd HH:mm") + " UTC";

    private static string DetailsTable(params (string Label, string ValueHtml)[] rows)
    {
        var builder = new StringBuilder("<table style=\"border-collapse:collapse\">");
        foreach (var (label, valueHtml) in rows)
        {
            builder.Append("<tr><td style=\"padding:2px 12px 2px 0;color:#666\">")
                   .Append(label)
                   .Append("</td><td>")
                   .Append(valueHtml)
                   .Append("</td></tr>");
        }

        return builder.Append("</table>").ToString();
    }

    private static string MessageBlock(string message)
    {
        var normalized = message.Replace("\r\n", "\n").Replace('\r', '\n');
        var htmlMessage = Encode(normalized).Replace("\n", "<br>");
        return "<div style=\"margin:16px 0;padding:12px 16px;background:#f5f5f5;border-radius:6px\">" + htmlMessage + "</div>";
    }

    private static string Wrap(string bodyHtml) =>
        "<!doctype html><html><body style=\"margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;" +
        "color:#222;line-height:1.5\"><div style=\"max-width:560px\">" + bodyHtml + "</div></body></html>";
}
