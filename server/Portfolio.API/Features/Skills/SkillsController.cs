using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Features.Skills;

[ApiController]
[Route("api/[controller]")]
public class SkillsController : ControllerBase
{
    private readonly ISkillsService _skillsService;
    private readonly IValidator<SkillUpsertDto> _validator;

    public SkillsController(ISkillsService skillsService, IValidator<SkillUpsertDto> validator)
    {
        _skillsService = skillsService;
        _validator = validator;
    }

    [HttpGet]
    [OutputCache(Tags = ["skills"])]
    public async Task<ActionResult<List<SkillDto>>> GetAll(CancellationToken cancellationToken)
    {
        var items = await _skillsService.GetAllSkillsAsync(cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<SkillDto>> Create([FromBody] SkillUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var created = await _skillsService.CreateSkillAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<SkillDto>> Update(Guid id, [FromBody] SkillUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var updated = await _skillsService.UpdateSkillAsync(id, dto, cancellationToken);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _skillsService.DeleteSkillAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
