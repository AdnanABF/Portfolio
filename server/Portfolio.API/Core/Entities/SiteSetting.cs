using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class SiteSetting
{
    [Key]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty; // "bio", "headline", "cv_url", "photo_url", "social_links", "available_for_hire"

    public string Value { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
