using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Contact;

public class ContactService : IContactService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public ContactService(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    public async Task<ContactInquiryDto> SubmitInquiryAsync(ContactRequestDto dto, CancellationToken cancellationToken = default)
    {
        var inquiry = new ContactInquiry
        {
            Name = dto.Name,
            Email = dto.Email,
            Subject = dto.Subject,
            Message = dto.Message,
            Status = "unread",
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactInquiries.AddAsync(inquiry, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("INQUIRY_RECEIVED", "ContactInquiry", inquiry.Id.ToString(), $"Inquiry received from {inquiry.Name} ({inquiry.Email})");

        return new ContactInquiryDto
        {
            Id = inquiry.Id,
            Name = inquiry.Name,
            Email = inquiry.Email,
            Subject = inquiry.Subject,
            Message = inquiry.Message,
            Status = inquiry.Status,
            CreatedAt = inquiry.CreatedAt
        };
    }

    public async Task<List<ContactInquiryDto>> GetInquiriesAsync(string? status = null, CancellationToken cancellationToken = default)
    {
        var query = _context.ContactInquiries.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status.ToLower() == status.ToLower());
        }

        return await query
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new ContactInquiryDto
            {
                Id = i.Id,
                Name = i.Name,
                Email = i.Email,
                Subject = i.Subject,
                Message = i.Message,
                Status = i.Status,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> UpdateInquiryStatusAsync(Guid id, string status, CancellationToken cancellationToken = default)
    {
        var inquiry = await _context.ContactInquiries.FindAsync(new object[] { id }, cancellationToken);
        if (inquiry == null) return false;

        inquiry.Status = status.ToLowerInvariant();
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("INQUIRY_STATUS_UPDATE", "ContactInquiry", id.ToString(), $"Updated status to {inquiry.Status}");
        return true;
    }
}
