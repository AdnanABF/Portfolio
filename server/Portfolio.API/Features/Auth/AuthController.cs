using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Auth;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ISessionManager _sessionManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IValidator<LoginRequest> _validator;

    public AuthController(
        IAuthService authService,
        ISessionManager sessionManager,
        UserManager<ApplicationUser> userManager,
        IValidator<LoginRequest> validator)
    {
        _authService = authService;
        _sessionManager = sessionManager;
        _userManager = userManager;
        _validator = validator;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var response = await _authService.LoginAsync(request, HttpContext, cancellationToken);
        if (response == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var user = await _authService.GetCurrentUserAsync(userId, cancellationToken);
        if (user == null) return NotFound();

        return Ok(user);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync(HttpContext);
        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("sessions")]
    public async Task<ActionResult<List<UserSessionDto>>> GetMySessions()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var sidClaim = User.FindFirst("sid")?.Value;
        Guid.TryParse(sidClaim, out var currentSessionId);

        var sessions = await _sessionManager.GetUserSessionsAsync(userId, currentSessionId);
        return Ok(sessions);
    }

    [Authorize]
    [HttpDelete("sessions/{id:guid}")]
    public async Task<IActionResult> RevokeMySession(Guid id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var revoked = await _sessionManager.RevokeSessionAsync(id, userId, isAdmin: false);
        if (!revoked)
        {
            return NotFound(new { message = "Session not found or not owned by user." });
        }

        return Ok(new { message = "Session revoked successfully." });
    }

    [Authorize]
    [HttpPost("sessions/revoke-all")]
    public async Task<IActionResult> RevokeAllMySessions()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return Unauthorized();

        await _authService.SignOutEverywhereAsync(user, HttpContext);
        return Ok(new { message = "All sessions revoked and signed out." });
    }
}
