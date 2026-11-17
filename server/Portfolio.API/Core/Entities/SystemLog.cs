using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class SystemLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(20)]
    public string Level { get; set; } = "Error"; // "Error", "Warning", "Information"

    public string Message { get; set; } = string.Empty;

    public string? Exception { get; set; }

    public string? StackTrace { get; set; }

    [MaxLength(255)]
    public string? Path { get; set; }

    [MaxLength(10)]
    public string? HttpMethod { get; set; }

    public int? StatusCode { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
