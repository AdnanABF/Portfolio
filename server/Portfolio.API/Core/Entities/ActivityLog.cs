using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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
