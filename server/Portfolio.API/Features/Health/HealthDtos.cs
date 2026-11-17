namespace Portfolio.API.Features.Health;

public class HealthResponseDto
{
    public string Status { get; set; } = "healthy";
    public long DbLatencyMs { get; set; }
    public double UptimeSeconds { get; set; }
    public string Framework { get; set; } = ".NET 10 Web API";
    public string Database { get; set; } = "PostgreSQL (Npgsql)";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
