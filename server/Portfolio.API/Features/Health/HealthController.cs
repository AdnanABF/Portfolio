using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Features.Health;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<HealthResponseDto>> GetHealth(CancellationToken cancellationToken)
    {
        var health = await _healthService.CheckHealthAsync(cancellationToken);
        return Ok(health);
    }
}
