using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Email;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Contact;

public class ContactService : IContactService
{
    private const string NotificationSenderName = "Portfolio";

    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IEmailSender _emailSender;
    private readonly ResendOptions _emailOptions;
    private readonly ILogger<ContactService> _logger;

    public ContactService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IEmailSender emailSender,
        IOptions<ResendOptions> emailOptions,
        ILogger<ContactService> logger)
    {
        _context = context;
        _activityLogger = activityLogger;
        _emailSender = emailSender;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    public async Task<ContactInquiryDto> SubmitInquiryAsync(ContactRequestDto dto, CancellationToken cancellationToken = default)
    {
        var inquiry = new ContactInquiry
        {
            Name = dto.Name,
            Email = dto.Email,
            Subject = dto.Subject,
            Message = dto.Message,
            Status = ContactInquiryStatuses.Unread,
            Type = ContactInquiryTypes.Contact,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactInquiries.AddAsync(inquiry, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("INQUIRY_RECEIVED", "ContactInquiry", inquiry.Id.ToString(), $"Inquiry received from {inquiry.Name} ({inquiry.Email})");

        await SendEmailsAsync(inquiry, projectTitle: null);

        return ToDto(inquiry, null, null);
    }

    public async Task<ContactInquiryDto> SubmitRepoRequestAsync(Guid projectId, string projectTitle, RepoAccessRequestDto dto, CancellationToken cancellationToken = default)
    {
        var inquiry = new ContactInquiry
        {
            Name = dto.Name,
            Email = dto.Email,
            // The subject is built on the server; the visitor only supplies name, email and message.
            Subject = ContactEmailTemplates.SingleLine($"Request access: {projectTitle}", 200),
            Message = dto.Message,
            Status = ContactInquiryStatuses.Unread,
            Type = ContactInquiryTypes.RepoRequest,
            ProjectId = projectId,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactInquiries.AddAsync(inquiry, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("REPO_REQUEST_RECEIVED", "ContactInquiry", inquiry.Id.ToString(), $"Repo access request for '{projectTitle}' from {inquiry.Name} ({inquiry.Email})");

        await SendEmailsAsync(inquiry, projectTitle);

        return ToDto(inquiry, projectTitle, null);
    }

    public async Task<ContactInquiryPage> GetInquiriesAsync(ContactInquiryQuery query, CancellationToken cancellationToken = default)
    {
        var inquiries = _context.ContactInquiries.AsNoTracking().AsQueryable();

        // Status: one status, or everything except archived (the inbox view) when none is given.
        var status = query.Status?.Trim().ToLowerInvariant();
        inquiries = string.IsNullOrEmpty(status)
            ? inquiries.Where(i => i.Status != ContactInquiryStatuses.Archived)
            : inquiries.Where(i => i.Status == status);

        var type = query.Type?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(type))
        {
            inquiries = inquiries.Where(i => i.Type == type);
        }

        if (query.From.HasValue)
        {
            var from = query.From.Value.UtcDateTime;
            inquiries = inquiries.Where(i => i.CreatedAt >= from);
        }

        if (query.To.HasValue)
        {
            var to = query.To.Value.UtcDateTime;
            inquiries = inquiries.Where(i => i.CreatedAt < to);
        }

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = $"%{EscapeLikePattern(search)}%";
            inquiries = inquiries.Where(i =>
                EF.Functions.ILike(i.Name, pattern) ||
                EF.Functions.ILike(i.Email, pattern) ||
                EF.Functions.ILike(i.Subject, pattern) ||
                EF.Functions.ILike(i.Message, pattern));
        }

        var totalCount = await inquiries.CountAsync(cancellationToken);

        var items = await inquiries
            .OrderByDescending(i => i.CreatedAt)
            .ThenByDescending(i => i.Id) // keeps the order stable when two messages share a timestamp
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(i => new ContactInquiryDto
            {
                Id = i.Id,
                Name = i.Name,
                Email = i.Email,
                Subject = i.Subject,
                Message = i.Message,
                Status = i.Status,
                Type = i.Type,
                ProjectId = i.ProjectId,
                ProjectTitle = i.Project != null ? i.Project.Title : null,
                ProjectSlug = i.Project != null ? i.Project.Slug : null,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var unreadCount = await _context.ContactInquiries
            .CountAsync(i => i.Status == ContactInquiryStatuses.Unread, cancellationToken);

        return new ContactInquiryPage
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            UnreadCount = unreadCount
        };
    }

    public async Task<bool> UpdateInquiryStatusAsync(Guid id, string status, CancellationToken cancellationToken = default)
    {
        var inquiry = await _context.ContactInquiries.FindAsync(new object[] { id }, cancellationToken);
        if (inquiry == null) return false;

        inquiry.Status = status.Trim().ToLowerInvariant();
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("INQUIRY_STATUS_UPDATE", "ContactInquiry", id.ToString(), $"Updated status to {inquiry.Status}");
        return true;
    }

    public async Task<int> BulkUpdateInquiryStatusAsync(IReadOnlyCollection<Guid> ids, string status, CancellationToken cancellationToken = default)
    {
        var normalized = status.Trim().ToLowerInvariant();
        var idList = ids.Distinct().ToList();

        var updated = await _context.ContactInquiries
            .Where(i => idList.Contains(i.Id))
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.Status, normalized), cancellationToken);

        if (updated > 0)
        {
            await _activityLogger.LogAsync("INQUIRY_BULK_STATUS_UPDATE", "ContactInquiry", "bulk", $"Set {updated} inquiries to {normalized}");
        }

        return updated;
    }

    /// <summary>Escapes the characters that mean something in a LIKE pattern, so a search for "50%" finds "50%".</summary>
    private static string EscapeLikePattern(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    /// <summary>
    /// Sends the notification to the owner, then the acknowledgement to the visitor. The inquiry is already
    /// saved, so a failed email is logged and never fails the request: the message stays in the admin inbox.
    /// </summary>
    private async Task SendEmailsAsync(ContactInquiry inquiry, string? projectTitle)
    {
        var isRepoRequest = projectTitle != null;
        var kind = isRepoRequest ? "repo request" : "contact message";

        // 1. Notify the owner. Reply-To is the visitor, so pressing Reply answers them directly.
        if (string.IsNullOrWhiteSpace(_emailOptions.OwnerEmail) || string.IsNullOrWhiteSpace(_emailOptions.NotifyFromAddress))
        {
            _logger.LogWarning("Owner notification skipped for inquiry {InquiryId}: Resend OwnerEmail or NotifyFromAddress is not set.", inquiry.Id);
        }
        else
        {
            var content = isRepoRequest
                ? ContactEmailTemplates.RepoRequestOwnerNotification(inquiry, projectTitle!)
                : ContactEmailTemplates.ContactOwnerNotification(inquiry);

            await TrySendAsync(
                new EmailMessage(
                    From: FormatAddress(NotificationSenderName, _emailOptions.NotifyFromAddress),
                    To: _emailOptions.OwnerEmail,
                    Subject: _emailOptions.SubjectPrefix + content.Subject,
                    Html: content.Html,
                    Text: content.Text,
                    ReplyTo: inquiry.Email,
                    IdempotencyKey: $"inquiry-{inquiry.Id}-owner"),
                $"{kind} notification",
                inquiry.Id);
        }

        // 2. Acknowledge the visitor. The text is fixed and contains nothing the visitor typed.
        if (_emailOptions.SendAutoReply && !string.IsNullOrWhiteSpace(_emailOptions.FromAddress))
        {
            var content = isRepoRequest
                ? ContactEmailTemplates.RepoRequestAcknowledgement(projectTitle!)
                : ContactEmailTemplates.ContactAcknowledgement();

            await TrySendAsync(
                new EmailMessage(
                    From: FormatAddress(_emailOptions.FromName, _emailOptions.FromAddress),
                    To: inquiry.Email,
                    Subject: _emailOptions.SubjectPrefix + content.Subject,
                    Html: content.Html,
                    Text: content.Text,
                    IdempotencyKey: $"inquiry-{inquiry.Id}-ack"),
                $"{kind} acknowledgement",
                inquiry.Id);
        }
    }

    private async Task TrySendAsync(EmailMessage message, string description, Guid inquiryId)
    {
        try
        {
            // No request cancellation token on purpose: once the inquiry is saved the emails should
            // still go out even if the visitor closes the page. The HTTP client has its own timeout.
            await _emailSender.SendAsync(message, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send {Description} for inquiry {InquiryId}.", description, inquiryId);
        }
    }

    private static string FormatAddress(string name, string address)
    {
        var cleanName = ContactEmailTemplates.SingleLine(name, 80).Replace("\"", string.Empty).Replace("<", string.Empty).Replace(">", string.Empty);
        return string.IsNullOrWhiteSpace(cleanName) ? address : $"{cleanName} <{address}>";
    }

    private static ContactInquiryDto ToDto(ContactInquiry inquiry, string? projectTitle, string? projectSlug) => new()
    {
        Id = inquiry.Id,
        Name = inquiry.Name,
        Email = inquiry.Email,
        Subject = inquiry.Subject,
        Message = inquiry.Message,
        Status = inquiry.Status,
        Type = inquiry.Type,
        ProjectId = inquiry.ProjectId,
        ProjectTitle = projectTitle,
        ProjectSlug = projectSlug,
        CreatedAt = inquiry.CreatedAt
    };
}
