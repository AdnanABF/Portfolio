namespace Portfolio.API.Features.Telemetry;

public class VisitorPingDto
{
    public string Path { get; set; } = string.Empty;
    public string? Referrer { get; set; }
}

public class CvDownloadPingDto
{
    public string? Referrer { get; set; }
}

public class AnalyticsSummaryDto
{
    public int TotalPageViews { get; set; }
    public int TotalCvDownloads { get; set; }
    public int TotalInquiries { get; set; }
    public int ActiveSessionsCount { get; set; }
    public List<TopProjectDto> TopProjects { get; set; } = new();
    public List<ReferrerCountDto> TopReferrers { get; set; } = new();
    public List<CountryCountDto> TopCountries { get; set; } = new();
}

public class TopProjectDto
{
    public string Slug { get; set; } = string.Empty;
    public int Views { get; set; }
}

public class ReferrerCountDto
{
    public string Referrer { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CountryCountDto
{
    public string CountryCode { get; set; } = string.Empty;
    public int Count { get; set; }
}
