using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.API.Features.Contact;
using Portfolio.API.Infrastructure.Extensions;

namespace Portfolio.API.Features.Projects;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly IValidator<ProjectUpsertDto> _validator;
    private readonly IContactService _contactService;
    private readonly IValidator<RepoAccessRequestDto> _accessRequestValidator;

    public ProjectsController(
        IProjectService projectService,
        IValidator<ProjectUpsertDto> validator,
        IContactService contactService,
        IValidator<RepoAccessRequestDto> accessRequestValidator)
    {
        _projectService = projectService;
        _validator = validator;
        _contactService = contactService;
        _accessRequestValidator = accessRequestValidator;
    }

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(PolicyName = "projects")]
    public async Task<ActionResult<List<ProjectDto>>> GetAll([FromQuery] bool includeDrafts = false, CancellationToken cancellationToken = default)
    {
        // Drafts are only ever returned to admins, whatever the query string says.
        var projects = await _projectService.GetAllProjectsAsync(includeDrafts && User.IsAdmin(), cancellationToken);
        return Ok(projects);
    }

    [AllowAnonymous]
    [HttpGet("{slug}")]
    [OutputCache(PolicyName = "projects")]
    public async Task<ActionResult<ProjectDto>> GetBySlug(string slug, CancellationToken cancellationToken = default)
    {
        var project = await _projectService.GetProjectBySlugAsync(slug, User.IsAdmin(), cancellationToken);
        if (project == null) return NotFound();
        return Ok(project);
    }

    /// <summary>
    /// A visitor asks for access to a private project's repository. Stored in the contact inbox as a
    /// repo request, and the owner and the visitor are emailed. Only published, private projects accept requests.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("{slug}/access-requests")]
    [EnableRateLimiting("access-request-rate-limit")]
    [RequestSizeLimit(20_000)]
    public async Task<IActionResult> RequestAccess(string slug, [FromBody] RepoAccessRequestDto dto, CancellationToken cancellationToken = default)
    {
        var validation = await _accessRequestValidator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        // Published projects only (drafts are never visible here, even to admins).
        var project = await _projectService.GetProjectBySlugAsync(slug, includeDrafts: false, cancellationToken);
        if (project == null)
        {
            return NotFound();
        }

        if (!project.IsRepoPrivate)
        {
            return BadRequest(new { message = "This project's repository is not private, so no access request is needed." });
        }

        var inquiry = await _contactService.SubmitRepoRequestAsync(project.Id, project.Title, dto, cancellationToken);
        return Ok(new { success = true, id = inquiry.Id, message = "Access request submitted successfully." });
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] ProjectUpsertDto dto, CancellationToken cancellationToken = default)
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
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<ProjectDto>> Update(Guid id, [FromBody] ProjectUpsertDto dto, CancellationToken cancellationToken = default)
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
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await _projectService.DeleteProjectAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
