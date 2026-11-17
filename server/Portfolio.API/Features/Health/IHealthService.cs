namespace Portfolio.API.Features.Health;

public interface IHealthService
{
    Task<HealthResponseDto> CheckHealthAsync(CancellationToken cancellationToken = default);
}
