using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class CvDownload
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(255)]
    public string Referrer { get; set; } = string.Empty;

    [MaxLength(10)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
