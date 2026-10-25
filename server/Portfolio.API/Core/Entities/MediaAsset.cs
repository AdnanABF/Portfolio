using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class MediaAsset
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    [MaxLength(500)]
    public string StorageRelativePath { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = "general";

    /// <summary>
    /// Access policy: "Public", "AdminOnly", or "Inherit"
    /// </summary>
    [MaxLength(30)]
    public string AccessPolicy { get; set; } = "Inherit";

    public Guid? EntityId { get; set; }

    [MaxLength(50)]
    public string? EntityType { get; set; }

    public Guid? UploadedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
