using Portfolio.API.Features.Homepage;
using Portfolio.API.Infrastructure.Extensions;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Features.Experience;

[ApiController]
[Route("api/[controller]")]
public class ExperienceController : ControllerBase
{
    private readonly IExperienceService _experienceService;
    private readonly IValidator<ExperienceUpsertDto> _validator;

    public ExperienceController(IExperienceService experienceService, IValidator<ExperienceUpsertDto> validator)
    {
        _experienceService = experienceService;
        _validator = validator;
    }

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(PolicyName = "experience")]
    public async Task<ActionResult<List<ExperienceDto>>> GetAll([FromQuery] bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        // Hidden items are only ever returned to admins, whatever the query string says.
        return await this.UnlessClientHungUp<List<ExperienceDto>>(async () =>
        {
            var items = await _experienceService.GetAllExperiencesAsync(includeHidden && User.IsAdmin(), cancellationToken);
            return Ok(items);
        }, cancellationToken);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ExperienceDto>> Create([FromBody] ExperienceUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var created = await _experienceService.CreateExperienceAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPut("order")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reorder([FromBody] ReorderDto dto, CancellationToken cancellationToken)
    {
        if (dto.Ids == null || dto.Ids.Count == 0 || dto.Ids.Count > 500) return BadRequest(new { message = "Send the ids in the new order." });
        return await _experienceService.ReorderExperiencesAsync(dto.Ids, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ExperienceDto>> Update(Guid id, [FromBody] ExperienceUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var updated = await _experienceService.UpdateExperienceAsync(id, dto, cancellationToken);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _experienceService.DeleteExperienceAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
