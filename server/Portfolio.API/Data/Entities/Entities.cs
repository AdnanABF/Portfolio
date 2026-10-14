using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace Portfolio.API.Data.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Role { get; set; } = "Editor"; // SuperAdmin, Editor, Viewer

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}

public class UserSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    [MaxLength(255)]
    public string SessionToken { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(500)]
    public string UserAgent { get; set; } = string.Empty;

    [MaxLength(100)]
    public string DeviceInfo { get; set; } = string.Empty; // e.g. "Chrome 124 on macOS"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    public bool IsRevoked { get; set; } = false;
    public DateTime? RevokedAt { get; set; }
}

public class ActivityLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    [MaxLength(100)]
    public string UserEmail { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Action { get; set; } = string.Empty; // e.g. "PROJECT_UPDATE", "CV_UPLOAD"

    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty; // e.g. "Project", "Profile", "Experience"

    [MaxLength(100)]
    public string EntityId { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Summary { get; set; } = string.Empty;

    public string? DetailsJson { get; set; } // diff or payload

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(100)]
    public string DeviceInfo { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class SystemLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(20)]
    public string Level { get; set; } = "Error"; // "Error", "Warning", "Information"

    public string Message { get; set; } = string.Empty;

    public string? Exception { get; set; }

    public string? StackTrace { get; set; }

    [MaxLength(255)]
    public string? Path { get; set; }

    [MaxLength(10)]
    public string? HttpMethod { get; set; }

    public int? StatusCode { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class VisitorAnalytic
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string Path { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Referrer { get; set; } = string.Empty;

    [MaxLength(10)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DeviceType { get; set; } = string.Empty; // Mobile, Desktop, Tablet

    [MaxLength(50)]
    public string Browser { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class CvDownload
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string Referrer { get; set; } = string.Empty;

    [MaxLength(10)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class Project
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Tagline { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(500)]
    public string HeroImageUrl { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = new();

    public List<string> Screenshots { get; set; } = new();

    [MaxLength(500)]
    public string LiveUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string GithubUrl { get; set; } = string.Empty;

    public bool IsFeatured { get; set; } = false;

    public int SortOrder { get; set; } = 0;

    /// <summary>
    /// JSON array of key metrics e.g. [{"label": "Uptime", "value": "99.9%"}]
    /// </summary>
    public string? KeyMetricsJson { get; set; }

    public string ContentMarkdown { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class BlogPost
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    public string Excerpt { get; set; } = string.Empty;

    public string ContentMarkdown { get; set; } = string.Empty;

    [MaxLength(500)]
    public string CoverImageUrl { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = new();

    public bool IsPublished { get; set; } = false;

    public DateTime? PublishedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Experience
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Role { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Company { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Period { get; set; } = string.Empty;

    public List<string> Achievements { get; set; } = new();

    public int SortOrder { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Skill
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty; // "Languages", "Backend", "Frontend", "Cloud", "Databases"

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? IconName { get; set; }

    public int SortOrder { get; set; } = 0;
}

public class SiteSetting
{
    [Key]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty; // "bio", "headline", "cv_url", "photo_url", "social_links", "available_for_hire"

    public string Value { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ContactInquiry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "unread"; // "unread", "read", "replied", "starred", "archived"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
