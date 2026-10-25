using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Portfolio.API.Features.Telemetry;

[ApiController]
[Route("api/[controller]")]
public class TelemetryController : ControllerBase
{
    private readonly ITelemetryService _telemetryService;

    public TelemetryController(ITelemetryService telemetryService)
    {
        _telemetryService = telemetryService;
    }

    [AllowAnonymous]
    [HttpPost("visit")]
    [EnableRateLimiting("telemetry-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> TrackVisit([FromBody] VisitorPingDto dto, CancellationToken cancellationToken)
    {
        await _telemetryService.TrackVisitAsync(dto, HttpContext, cancellationToken);
        return Ok(new { ok = true });
    }

    [AllowAnonymous]
    [HttpPost("cv-download")]
    [EnableRateLimiting("telemetry-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> TrackCvDownload([FromBody] CvDownloadPingDto dto, CancellationToken cancellationToken)
    {
        await _telemetryService.TrackCvDownloadAsync(dto, HttpContext, cancellationToken);
        return Ok(new { ok = true });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("summary")]
    public async Task<ActionResult<AnalyticsSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        var summary = await _telemetryService.GetAnalyticsSummaryAsync(cancellationToken);
        return Ok(summary);
    }
}
