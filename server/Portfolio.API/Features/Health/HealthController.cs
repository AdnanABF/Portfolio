using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Portfolio.API.Infrastructure.Extensions;

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
        // A health badge that polls is often abandoned mid-check (page change, reload): answer 499, not an error.
        return await this.UnlessClientHungUp<HealthResponseDto>(
            async () => Ok(await _healthService.CheckHealthAsync(cancellationToken)),
            cancellationToken);
    }
}
