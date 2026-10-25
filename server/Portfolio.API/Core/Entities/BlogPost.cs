using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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
