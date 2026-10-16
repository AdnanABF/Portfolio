using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Features.Blog;

[ApiController]
[Route("api/[controller]")]
public class BlogController : ControllerBase
{
    private readonly IBlogService _blogService;
    private readonly IValidator<BlogPostUpsertDto> _validator;

    public BlogController(IBlogService blogService, IValidator<BlogPostUpsertDto> validator)
    {
        _blogService = blogService;
        _validator = validator;
    }

    [HttpGet]
    [OutputCache(Tags = ["blog"])]
    public async Task<ActionResult<List<BlogPostDto>>> GetAll([FromQuery] bool includeDrafts = false, CancellationToken cancellationToken = default)
    {
        var posts = await _blogService.GetAllPostsAsync(includeDrafts, cancellationToken);
        return Ok(posts);
    }

    [HttpGet("{slug}")]
    [OutputCache(Tags = ["blog"])]
    public async Task<ActionResult<BlogPostDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var post = await _blogService.GetPostBySlugAsync(slug, cancellationToken);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<BlogPostDto>> Create([FromBody] BlogPostUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var created = await _blogService.CreatePostAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetBySlug), new { slug = created.Slug }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<ActionResult<BlogPostDto>> Update(Guid id, [FromBody] BlogPostUpsertDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var updated = await _blogService.UpdatePostAsync(id, dto, cancellationToken);
        if (updated == null) return NotFound();
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _blogService.DeletePostAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
