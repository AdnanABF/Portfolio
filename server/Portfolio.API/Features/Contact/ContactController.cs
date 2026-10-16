using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Features.Contact;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IContactService _contactService;
    private readonly IValidator<ContactRequestDto> _validator;

    public ContactController(IContactService contactService, IValidator<ContactRequestDto> validator)
    {
        _contactService = contactService;
        _validator = validator;
    }

    [HttpPost]
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
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<List<ContactInquiryDto>>> GetInquiries([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var inquiries = await _contactService.GetInquiriesAsync(status, cancellationToken);
        return Ok(inquiries);
    }

    [HttpPut("inquiries/{id:guid}/status")]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return BadRequest(new { message = "Status cannot be empty." });
        }

        var updated = await _contactService.UpdateInquiryStatusAsync(id, status, cancellationToken);
        if (!updated) return NotFound();

        return Ok(new { id, status });
    }
}
