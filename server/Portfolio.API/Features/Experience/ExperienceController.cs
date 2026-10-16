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

    [HttpGet]
    [OutputCache(Tags = ["experience"])]
    public async Task<ActionResult<List<ExperienceDto>>> GetAll(CancellationToken cancellationToken)
    {
        var items = await _experienceService.GetAllExperiencesAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Editor")]
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

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Editor")]
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
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _experienceService.DeleteExperienceAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
