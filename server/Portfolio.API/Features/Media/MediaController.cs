using System.Security.Claims;
using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Net.Http.Headers;
using Portfolio.API.Features.Telemetry;
using Portfolio.API.Infrastructure.Extensions;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Media;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly IValidator<IFormFile> _fileValidator;
    private readonly ITelemetryService _telemetry;
    private readonly IActivityLogger _activityLogger;
    private readonly IMemoryCache _cache;

    /// <summary>Crawlers, link previewers and headless browsers: they fetch the file but nobody downloaded it.</summary>
    private static readonly Regex AutomatedClient = new(
        "bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public MediaController(
        IMediaService mediaService,
        IValidator<IFormFile> fileValidator,
        ITelemetryService telemetry,
        IActivityLogger activityLogger,
        IMemoryCache cache)
    {
        _mediaService = mediaService;
        _fileValidator = fileValidator;
        _telemetry = telemetry;
        _activityLogger = activityLogger;
        _cache = cache;
    }

    /// <summary>
    /// Counts and logs a visitor's CV download (IP, device and country come from the request). Skipped for the owner
    /// previewing their own CV, for crawlers and link previewers, for the later parts of a ranged request, and for repeats
    /// from the same address within ten minutes (a browser often asks twice: preview, then save). Never fails the download.
    /// </summary>
    private async Task RecordCvDownloadAsync(MediaFileResult file, CancellationToken cancellationToken)
    {
        if (file.Category != MediaService.CvCategory || User.IsAdmin()) return;
        if (AutomatedClient.IsMatch(Request.Headers.UserAgent.ToString())) return;

        var range = Request.Headers.Range.ToString();
        if (!string.IsNullOrEmpty(range) && !range.StartsWith("bytes=0", StringComparison.Ordinal)) return;

        var key = $"cv-download:{HttpContext.GetClientIpAddress()}:{file.Id}";
        if (_cache.TryGetValue(key, out _)) return;
        _cache.Set(key, true, TimeSpan.FromMinutes(10));

        try
        {
            var referrer = Request.Headers.Referer.ToString();
            await _telemetry.TrackCvDownloadAsync(new CvDownloadPingDto { Referrer = string.IsNullOrEmpty(referrer) ? "direct" : referrer }, HttpContext, cancellationToken);
            await _activityLogger.LogAsync("CV_DOWNLOAD", "Media", file.Id.ToString(), $"CV downloaded ({file.FileName}).", actor: "visitor");
        }
        catch (Exception)
        {
            // Counting a download must never stop the visitor from getting the file.
        }
    }

    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB max
    public async Task<ActionResult<MediaUploadResponse>> Upload(
        [FromForm] MediaUploadRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = await _fileValidator.ValidateAsync(request.File, cancellationToken);
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
            request.File,
            request.Category ?? "general",
            request.EntityId,
            request.EntityType,
            request.AccessPolicy ?? "Inherit",
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

        await RecordCvDownloadAsync(fileResult, cancellationToken);

        // A CV opens in the browser, but is saved under its proper name ("Adnan CV <date>").
        if (fileResult.Category == MediaService.CvCategory)
        {
            Response.Headers.ContentDisposition = new ContentDispositionHeaderValue("inline") { FileName = fileResult.FileName }.ToString();
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

        await RecordCvDownloadAsync(fileResult, cancellationToken);

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
