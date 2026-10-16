using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Features.Projects;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IValidator<ProjectUpsertDto> _validator;

    public ProjectsController(IProjectService projectService, IValidator<ProjectUpsertDto> validator)
    {
        _projectService = projectService;
        _validator = validator;
    }

    [HttpGet]
    [OutputCache(Tags = ["projects"])]
    public async Task<ActionResult<List<ProjectDto>>> GetAll(CancellationToken cancellationToken)
    {
        var projects = await _projectService.GetAllProjectsAsync(cancellationToken);
        return Ok(projects);
    }

    [HttpGet("{slug}")]
    [OutputCache(Tags = ["projects"])]
    public async Task<ActionResult<ProjectDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var project = await _projectService.GetProjectBySlugAsync(slug, cancellationToken);
        if (project == null) return NotFound();
        return Ok(project);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] ProjectUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var created = await _projectService.CreateProjectAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetBySlug), new { slug = created.Slug }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, [FromBody] ProjectUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var updated = await _projectService.UpdateProjectAsync(id, dto, cancellationToken);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _projectService.DeleteProjectAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
