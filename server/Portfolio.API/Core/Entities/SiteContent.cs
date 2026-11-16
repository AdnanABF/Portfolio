using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

/// <summary>
/// The editable content of the public home page, stored as one JSON document.
/// There are two rows: <see cref="SiteContentKeys.Draft"/> (what the admin is editing and previewing) and
/// <see cref="SiteContentKeys.Published"/> (what visitors see). Publishing copies the draft over the published row.
/// </summary>
public class SiteContent
{
    [Key]
    [MaxLength(20)]
    public string Key { get; set; } = string.Empty;

    /// <summary>The document, serialized by the SiteContent feature (see HomepageContent).</summary>
    public string Json { get; set; } = "{}";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Who last changed this row (the admin's email at the time), for the history in the admin hub.</summary>
    [MaxLength(256)]
    public string? UpdatedBy { get; set; }
}

public static class SiteContentKeys
{
    public const string Draft = "draft";
    public const string Published = "published";
}
