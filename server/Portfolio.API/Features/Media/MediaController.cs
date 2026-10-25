using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Features.Media;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly IValidator<IFormFile> _fileValidator;

    public MediaController(IMediaService mediaService, IValidator<IFormFile> fileValidator)
    {
        _mediaService = mediaService;
        _fileValidator = fileValidator;
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB max
    public async Task<ActionResult<MediaUploadResponse>> Upload(
        [FromForm] IFormFile file,
        [FromForm] string? category = "general",
        [FromForm] Guid? entityId = null,
        [FromForm] string? entityType = null,
        [FromForm] string? accessPolicy = "Inherit",
        CancellationToken cancellationToken = default)
    {
        var validation = await _fileValidator.ValidateAsync(file, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        Guid? userId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdStr, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        var result = await _mediaService.UploadAsync(
            file,
            category ?? "general",
            entityId,
            entityType,
            accessPolicy ?? "Inherit",
            userId,
            cancellationToken);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMedia(Guid id, CancellationToken cancellationToken)
    {
        var fileResult = await _mediaService.GetFileAsync(id, User, cancellationToken);
        if (fileResult == null)
        {
            return NotFound(new { message = "Media asset not found or access denied." });
        }

        if (fileResult.IsPublic)
        {
            Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else
        {
            Response.Headers.CacheControl = "private, no-cache, no-store";
        }

        return PhysicalFile(fileResult.PhysicalPath, fileResult.ContentType, enableRangeProcessing: true);
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> DownloadMedia(Guid id, CancellationToken cancellationToken)
    {
        var fileResult = await _mediaService.GetFileAsync(id, User, cancellationToken);
        if (fileResult == null)
        {
            return NotFound(new { message = "Media asset not found or access denied." });
        }

        if (fileResult.IsPublic)
        {
            Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else
        {
            Response.Headers.CacheControl = "private, no-cache, no-store";
        }

        return PhysicalFile(fileResult.PhysicalPath, fileResult.ContentType, fileDownloadName: fileResult.FileName, enableRangeProcessing: true);
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteMedia(Guid id, CancellationToken cancellationToken)
    {
        var success = await _mediaService.DeleteAsync(id, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = "Media asset not found." });
        }

        return NoContent();
    }
}
