namespace Portfolio.API.Features.Telemetry;

public interface ITelemetryService
{
    Task TrackVisitAsync(VisitorPingDto dto, HttpContext httpContext, CancellationToken cancellationToken = default);
    Task TrackCvDownloadAsync(CvDownloadPingDto dto, HttpContext httpContext, CancellationToken cancellationToken = default);
    Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(CancellationToken cancellationToken = default);
}
