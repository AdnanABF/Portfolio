using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Features.Admin;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("activity")]
    public async Task<ActionResult<ActivityLogPage>> GetActivityLogs(
        [FromQuery] ActivityLogQuery query,
        [FromServices] IValidator<ActivityLogQuery> validator,
        CancellationToken cancellationToken = default)
    {
        var validation = await validator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        return Ok(await _adminService.GetActivityLogsAsync(query, cancellationToken));
    }

    [HttpGet("system-logs")]
    public async Task<ActionResult<SystemLogPage>> GetSystemLogs(
        [FromQuery] SystemLogQuery query,
        [FromServices] IValidator<SystemLogQuery> validator,
        CancellationToken cancellationToken = default)
    {
        var validation = await validator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        return Ok(await _adminService.GetSystemLogsAsync(query, cancellationToken));
    }
}
