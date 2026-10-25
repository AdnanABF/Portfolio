using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class UserSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }

    [MaxLength(50)]
    public string LoginMethod { get; set; } = "Password";

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(500)]
    public string UserAgent { get; set; } = string.Empty;

    [MaxLength(100)]
    public string DeviceInfo { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(14);

    public bool IsRevoked { get; set; } = false;
    public DateTime? RevokedAt { get; set; }
}
