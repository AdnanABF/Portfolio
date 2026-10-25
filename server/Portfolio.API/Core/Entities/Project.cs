using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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

    public bool IsPublished { get; set; } = true;

    public int SortOrder { get; set; } = 0;

    /// <summary>
    /// JSON array of key metrics e.g. [{"label": "Uptime", "value": "99.9%"}]
    /// </summary>
    public string? KeyMetricsJson { get; set; }

    public string ContentMarkdown { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
