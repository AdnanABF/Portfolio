using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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
