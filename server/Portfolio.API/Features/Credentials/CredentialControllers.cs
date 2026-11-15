using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Portfolio.API.Features.Homepage;
using Portfolio.API.Infrastructure.Extensions;

namespace Portfolio.API.Features.Credentials;

/// <summary>Education entries. Everyone reads the visible ones; admins manage them.</summary>
[ApiController]
[Route("api/education")]
public class EducationController : ControllerBase
{
    private readonly ICredentialsService _service;
    private readonly IValidator<EducationUpsertDto> _validator;

    public EducationController(ICredentialsService service, IValidator<EducationUpsertDto> validator)
    {
        _service = service;
        _validator = validator;
    }

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(PolicyName = "education")]
    public async Task<ActionResult<List<EducationDto>>> GetAll([FromQuery] bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        // Hidden items are only ever returned to admins, whatever the query string says.
        return await this.UnlessClientHungUp<List<EducationDto>>(async () =>
            Ok(await _service.GetEducationAsync(includeHidden && User.IsAdmin(), cancellationToken)), cancellationToken);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<EducationDto>> Create([FromBody] EducationUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var created = await _service.CreateEducationAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPut("order")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reorder([FromBody] ReorderDto dto, CancellationToken cancellationToken)
    {
        if (dto.Ids == null || dto.Ids.Count == 0 || dto.Ids.Count > 500) return BadRequest(new { message = "Send the ids in the new order." });
        return await _service.ReorderEducationAsync(dto.Ids, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<EducationDto>> Update(Guid id, [FromBody] EducationUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var updated = await _service.UpdateEducationAsync(id, dto, cancellationToken);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await _service.DeleteEducationAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}

/// <summary>Certifications. Everyone reads the visible ones; admins manage them.</summary>
[ApiController]
[Route("api/certifications")]
public class CertificationsController : ControllerBase
{
    private readonly ICredentialsService _service;
    private readonly IValidator<CertificationUpsertDto> _validator;

    public CertificationsController(ICredentialsService service, IValidator<CertificationUpsertDto> validator)
    {
        _service = service;
        _validator = validator;
    }

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(PolicyName = "certifications")]
    public async Task<ActionResult<List<CertificationDto>>> GetAll([FromQuery] bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        return await this.UnlessClientHungUp<List<CertificationDto>>(async () =>
            Ok(await _service.GetCertificationsAsync(includeHidden && User.IsAdmin(), cancellationToken)), cancellationToken);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<CertificationDto>> Create([FromBody] CertificationUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var created = await _service.CreateCertificationAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPut("order")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reorder([FromBody] ReorderDto dto, CancellationToken cancellationToken)
    {
        if (dto.Ids == null || dto.Ids.Count == 0 || dto.Ids.Count > 500) return BadRequest(new { message = "Send the ids in the new order." });
        return await _service.ReorderCertificationsAsync(dto.Ids, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<CertificationDto>> Update(Guid id, [FromBody] CertificationUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var updated = await _service.UpdateCertificationAsync(id, dto, cancellationToken);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await _service.DeleteCertificationAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
