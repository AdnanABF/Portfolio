using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Contact;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IContactService _contactService;
    private readonly IValidator<ContactRequestDto> _validator;
    private readonly IValidator<ContactInquiryQuery> _queryValidator;
    private readonly IValidator<BulkInquiryStatusDto> _bulkValidator;

    public ContactController(
        IContactService contactService,
        IValidator<ContactRequestDto> validator,
        IValidator<ContactInquiryQuery> queryValidator,
        IValidator<BulkInquiryStatusDto> bulkValidator)
    {
        _contactService = contactService;
        _validator = validator;
        _queryValidator = queryValidator;
        _bulkValidator = bulkValidator;
    }

    [AllowAnonymous]
    [HttpPost]
    [EnableRateLimiting("contact-rate-limit")]
    [RequestSizeLimit(50_000)]
    public async Task<IActionResult> Submit([FromBody] ContactRequestDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var inquiry = await _contactService.SubmitInquiryAsync(dto, cancellationToken);
        return Ok(new { success = true, id = inquiry.Id, message = "Inquiry submitted successfully." });
    }

    [HttpGet("inquiries")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ContactInquiryPage>> GetInquiries([FromQuery] ContactInquiryQuery query, CancellationToken cancellationToken)
    {
        var validation = await _queryValidator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var page = await _contactService.GetInquiriesAsync(query, cancellationToken);
        return Ok(page);
    }

    [HttpPut("inquiries/{id:guid}/status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status, CancellationToken cancellationToken)
    {
        if (!ContactInquiryStatuses.IsValid(status))
        {
            return BadRequest(new { message = "Status must be unread, read, replied or archived." });
        }

        var updated = await _contactService.UpdateInquiryStatusAsync(id, status, cancellationToken);
        if (!updated) return NotFound();

        return Ok(new { id, status = status.Trim().ToLowerInvariant() });
    }

    /// <summary>Sets one status on several messages at once (for example "archive the selected messages").</summary>
    [HttpPost("inquiries/bulk-status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkInquiryStatusDto dto, CancellationToken cancellationToken)
    {
        var validation = await _bulkValidator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var updated = await _contactService.BulkUpdateInquiryStatusAsync(dto.Ids, dto.Status, cancellationToken);
        return Ok(new { updated });
    }
}
