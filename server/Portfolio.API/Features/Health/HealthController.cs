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
        try
        {
            var health = await _healthService.CheckHealthAsync(cancellationToken);
            return Ok(health);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The caller hung up mid-check (a timeout, a page reload, a closed tab). This happens all the time
            // for a health badge that polls, nobody is waiting for the answer, and it is not an error.
            return StatusCode(StatusCodes.Status499ClientClosedRequest);
        }
    }
}
