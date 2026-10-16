using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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
