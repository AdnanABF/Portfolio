using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Portfolio.API.Infrastructure.Email;

/// <summary>Sends email through the Resend REST API (https://resend.com/docs/api-reference/emails/send-email).</summary>
public class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _http;
    private readonly ResendOptions _options;

    public ResendEmailSender(HttpClient http, IOptions<ResendOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var payload = new ResendPayload
        {
            From = message.From,
            To = new[] { message.To },
            Subject = message.Subject,
            Html = message.Html,
            Text = message.Text,
            ReplyTo = message.ReplyTo
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        if (!string.IsNullOrWhiteSpace(message.IdempotencyKey))
        {
            // Lets Resend ignore a repeat of the same send (for example after a retry).
            request.Headers.Add("Idempotency-Key", message.IdempotencyKey);
        }

        HttpResponseMessage response;
        try
        {
            response = await _http.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new EmailSendException("Could not reach the email provider.", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                if (body.Length > 300)
                {
                    body = body[..300];
                }

                throw new EmailSendException($"Email provider returned {(int)response.StatusCode}: {body}");
            }
        }
    }

    private sealed class ResendPayload
    {
        [JsonPropertyName("from")] public string From { get; set; } = string.Empty;
        [JsonPropertyName("to")] public string[] To { get; set; } = Array.Empty<string>();
        [JsonPropertyName("subject")] public string Subject { get; set; } = string.Empty;
        [JsonPropertyName("html")] public string Html { get; set; } = string.Empty;
        [JsonPropertyName("text")] public string Text { get; set; } = string.Empty;

        [JsonPropertyName("reply_to")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ReplyTo { get; set; }
    }
}
