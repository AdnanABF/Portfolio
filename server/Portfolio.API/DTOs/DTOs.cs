using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.DTOs;

// --- Auth DTOs ---

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

public class UserSessionDto
{
    public Guid Id { get; set; }
    public string DeviceInfo { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastActiveAt { get; set; }
    public bool IsOnline => (DateTime.UtcNow - LastActiveAt).TotalMinutes < 5;
    public bool IsRevoked { get; set; }
}

// --- Content DTOs ---

public class ProjectDto
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string HeroImageUrl { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public List<string> Screenshots { get; set; } = new();
    public string LiveUrl { get; set; } = string.Empty;
    public string GithubUrl { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public string? KeyMetricsJson { get; set; }
    public string ContentMarkdown { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class ProjectUpsertDto
{
    [Required, MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string Tagline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string HeroImageUrl { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public List<string> Screenshots { get; set; } = new();
    public string LiveUrl { get; set; } = string.Empty;
    public string GithubUrl { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public string? KeyMetricsJson { get; set; }
    public string ContentMarkdown { get; set; } = string.Empty;
}

public class ExperienceDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Achievements { get; set; } = new();
    public int SortOrder { get; set; }
}

public class ExperienceUpsertDto
{
    [Required, MaxLength(100)]
    public string Role { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Company { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Achievements { get; set; } = new();
    public int SortOrder { get; set; }
}

public class SkillDto
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public int SortOrder { get; set; }
}

public class SkillUpsertDto
{
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? IconName { get; set; }
    public int SortOrder { get; set; }
}

public class BlogPostDto
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string ContentMarkdown { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class BlogPostUpsertDto
{
    [Required, MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    [Required, MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string Excerpt { get; set; } = string.Empty;
    public string ContentMarkdown { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class SiteSettingUpdateDto
{
    [Required]
    public string Value { get; set; } = string.Empty;
}

public class ContactRequestDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required, MinLength(10)]
    public string Message { get; set; } = string.Empty;
}

public class ContactInquiryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "unread";
    public DateTime CreatedAt { get; set; }
}

// --- Media DTOs ---

public class PresignedUrlRequest
{
    [Required]
    public string FileName { get; set; } = string.Empty;

    [Required]
    public string ContentType { get; set; } = string.Empty;

    public string Folder { get; set; } = "general"; // "projects", "blog", "cv", "profile"
}

public class PresignedUrlResponse
{
    public string UploadUrl { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
}

// --- Telemetry & Logs DTOs ---

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

public class ActivityLogDto
{
    public Guid Id { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? DetailsJson { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string DeviceInfo { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class SystemLogDto
{
    public Guid Id { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? StackTrace { get; set; }
    public string? Path { get; set; }
    public string? HttpMethod { get; set; }
    public int? StatusCode { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}
