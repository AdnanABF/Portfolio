using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

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
