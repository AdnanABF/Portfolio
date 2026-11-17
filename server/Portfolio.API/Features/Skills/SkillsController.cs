using Portfolio.API.Features.Homepage;
using Portfolio.API.Infrastructure.Extensions;
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

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(PolicyName = "skills")]
    public async Task<ActionResult<List<SkillDto>>> GetAll([FromQuery] bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        // Hidden items are only ever returned to admins, whatever the query string says.
        return await this.UnlessClientHungUp<List<SkillDto>>(async () =>
        {
            var items = await _skillsService.GetAllSkillsAsync(includeHidden && User.IsAdmin(), cancellationToken);
            return Ok(items);
        }, cancellationToken);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
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

    [HttpPut("order")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Reorder([FromBody] ReorderDto dto, CancellationToken cancellationToken)
    {
        if (dto.Ids == null || dto.Ids.Count == 0 || dto.Ids.Count > 500) return BadRequest(new { message = "Send the ids in the new order." });
        return await _skillsService.ReorderSkillsAsync(dto.Ids, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
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
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _skillsService.DeleteSkillAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
