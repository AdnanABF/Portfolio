using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.Features.Admin;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ISessionManager _sessionManager;

    public AdminController(IAdminService adminService, ISessionManager sessionManager)
    {
        _adminService = adminService;
        _sessionManager = sessionManager;
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<List<UserSessionDto>>> GetSessions()
    {
        var sessions = await _sessionManager.GetAdminSessionsAsync();
        return Ok(sessions);
    }

    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> RevokeSession(Guid id)
    {
        var revoked = await _sessionManager.RevokeSessionAsync(id, requestingUserId: null, isAdmin: true);
        if (!revoked)
        {
            return NotFound(new { message = "Session not found." });
        }
        return Ok(new { message = "Session revoked successfully." });
    }

    [HttpGet("activity")]
    public async Task<ActionResult<List<ActivityLogDto>>> GetActivityLogs([FromQuery] int take = 100, CancellationToken cancellationToken = default)
    {
        var logs = await _adminService.GetActivityLogsAsync(take, cancellationToken);
        return Ok(logs);
    }

    [HttpGet("system-logs")]
    public async Task<ActionResult<List<SystemLogDto>>> GetSystemLogs(
        [FromQuery] int take = 100, 
        [FromQuery] string? level = null, 
        CancellationToken cancellationToken = default)
    {
        var logs = await _adminService.GetSystemLogsAsync(take, level, cancellationToken);
        return Ok(logs);
    }
}
