using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Extensions;

namespace Portfolio.API.Features.Telemetry;

public class TelemetryService : ITelemetryService
{
    private readonly AppDbContext _context;

    public TelemetryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task TrackVisitAsync(VisitorPingDto dto, HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        var country = httpContext.Request.Headers["CF-IPCountry"].ToString();
        var city = httpContext.Request.Headers["CF-IPCity"].ToString();
        var ua = httpContext.Request.Headers["User-Agent"].ToString();

        var analytic = new VisitorAnalytic
        {
            Path = dto.Path.Length > 255 ? dto.Path[..255] : dto.Path,
            Referrer = (dto.Referrer ?? "").Length > 255 ? (dto.Referrer ?? "")[..255] : (dto.Referrer ?? ""),
            CountryCode = string.IsNullOrEmpty(country) ? "GLOBAL" : country,
            City = city,
            DeviceType = ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ? "Mobile" : "Desktop",
            Browser = ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) ? "Chrome" : "Other",
            Timestamp = DateTime.UtcNow
        };

        await _context.VisitorAnalytics.AddAsync(analytic, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task TrackCvDownloadAsync(CvDownloadPingDto dto, HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        var country = httpContext.Request.Headers["CF-IPCountry"].ToString();
        var ip = httpContext.GetClientIpAddress();

        var cv = new CvDownload
        {
            Referrer = (dto.Referrer ?? "").Length > 255 ? (dto.Referrer ?? "")[..255] : (dto.Referrer ?? ""),
            CountryCode = string.IsNullOrEmpty(country) ? "GLOBAL" : country,
            IpAddress = ip,
            Timestamp = DateTime.UtcNow
        };

        await _context.CvDownloads.AddAsync(cv, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<AnalyticsSummaryDto> GetAnalyticsSummaryAsync(CancellationToken cancellationToken = default)
    {
        var totalViews = await _context.VisitorAnalytics.CountAsync(cancellationToken);
        var totalCv = await _context.CvDownloads.CountAsync(cancellationToken);
        var totalInquiries = await _context.ContactInquiries.CountAsync(cancellationToken);
        var activeSessions = await _context.UserSessions.CountAsync(
            s => !s.IsRevoked && (DateTime.UtcNow - s.LastActiveAt).TotalMinutes < 5, 
            cancellationToken);

        var topProjects = await _context.VisitorAnalytics
            .Where(v => v.Path.StartsWith("/projects/"))
            .GroupBy(v => v.Path.Replace("/projects/", ""))
            .Select(g => new TopProjectDto { Slug = g.Key, Views = g.Count() })
            .OrderByDescending(x => x.Views)
            .Take(5)
            .ToListAsync(cancellationToken);

        var topReferrers = await _context.VisitorAnalytics
            .Where(v => !string.IsNullOrEmpty(v.Referrer))
            .GroupBy(v => v.Referrer)
            .Select(g => new ReferrerCountDto { Referrer = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(cancellationToken);

        var topCountries = await _context.VisitorAnalytics
            .GroupBy(v => v.CountryCode)
            .Select(g => new CountryCountDto { CountryCode = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(cancellationToken);

        return new AnalyticsSummaryDto
        {
            TotalPageViews = totalViews,
            TotalCvDownloads = totalCv,
            TotalInquiries = totalInquiries,
            ActiveSessionsCount = activeSessions,
            TopProjects = topProjects,
            TopReferrers = topReferrers,
            TopCountries = topCountries
        };
    }
}
