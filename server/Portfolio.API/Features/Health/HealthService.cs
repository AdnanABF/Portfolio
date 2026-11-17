using System.Diagnostics;
using Portfolio.API.Core.Data;

namespace Portfolio.API.Features.Health;

public class HealthService : IHealthService
{
    private readonly AppDbContext _context;
    private static readonly DateTime StartTime = DateTime.UtcNow;

    public HealthService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<HealthResponseDto> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
        sw.Stop();

        return new HealthResponseDto
        {
            Status = canConnect ? "healthy" : "unhealthy",
            DbLatencyMs = sw.ElapsedMilliseconds,
            UptimeSeconds = (DateTime.UtcNow - StartTime).TotalSeconds,
            Framework = ".NET 10 Web API",
            Database = "PostgreSQL (Npgsql)",
            Timestamp = DateTime.UtcNow
        };
    }
}
