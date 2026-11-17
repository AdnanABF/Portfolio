using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Portfolio.API.Features.Admin;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.Features.Users;

/// <summary>The members panel API. Only the SuperAdmin may use it.</summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "SuperAdminOnly")]
public class UsersController : ControllerBase
{
    private readonly IUserAdminService _users;
    private readonly IAdminService _adminService;

    public UsersController(IUserAdminService users, IAdminService adminService)
    {
        _users = users;
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<ActionResult<MemberPage>> GetAll(
        [FromQuery] MemberQuery query,
        [FromServices] IValidator<MemberQuery> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        return Ok(await _users.GetMembersAsync(query, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MemberDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var member = await _users.GetMemberAsync(id, cancellationToken);
        return member == null ? NotFound(new { message = "Member not found." }) : Ok(member);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] MemberCreateDto dto,
        [FromServices] IValidator<MemberCreateDto> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var result = await _users.CreateAsync(dto, cancellationToken);
        if (result.Status != UserOpStatus.Ok) return ToActionResult(result);

        return CreatedAtAction(nameof(Get), new { id = result.Value!.Member.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] MemberUpdateDto dto,
        [FromServices] IValidator<MemberUpdateDto> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        return ToActionResult(await _users.UpdateAsync(id, dto, ActorId(), cancellationToken));
    }

    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await _users.SetActiveAsync(id, true, ActorId(), cancellationToken));

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await _users.SetActiveAsync(id, false, ActorId(), cancellationToken));

    /// <summary>Soft delete: the member is hidden and cannot sign in, but the record is kept and can be restored.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await _users.SoftDeleteAsync(id, ActorId(), cancellationToken));

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await _users.RestoreAsync(id, cancellationToken));

    /// <summary>Permanent erase on request: removes the account and anonymizes the member's log entries.</summary>
    [HttpDelete("{id:guid}/erase")]
    public async Task<IActionResult> Erase(
        Guid id,
        [FromBody] EraseMemberDto dto,
        [FromServices] IValidator<EraseMemberDto> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var result = await _users.EraseAsync(id, dto.ConfirmEmail, ActorId(), cancellationToken);
        return result.Status == UserOpStatus.Ok ? NoContent() : ToActionResult(result);
    }

    [HttpPost("{id:guid}/resend-invite")]
    public async Task<IActionResult> ResendInvite(Guid id, CancellationToken cancellationToken)
    {
        var result = await _users.ResendInviteAsync(id, cancellationToken);
        return result.Status == UserOpStatus.Ok ? Ok(new { emailSent = result.Value }) : ToActionResult(result);
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, CancellationToken cancellationToken)
    {
        var result = await _users.SendPasswordResetAsync(id, cancellationToken);
        return result.Status == UserOpStatus.Ok ? Ok(new { emailSent = result.Value }) : ToActionResult(result);
    }

    /// <summary>Sessions of one member. Ended (revoked or expired) sessions only appear with includeEnded=true.</summary>
    [HttpGet("{id:guid}/sessions")]
    public async Task<ActionResult<List<UserSessionDto>>> GetSessions(Guid id, [FromQuery] bool includeEnded = false, CancellationToken cancellationToken = default) =>
        ToActionResult(await _users.GetSessionsAsync(id, includeEnded, CurrentSessionId(), cancellationToken));

    [HttpDelete("{id:guid}/sessions/{sessionId:guid}")]
    public async Task<IActionResult> RevokeSession(Guid id, Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _users.RevokeSessionAsync(id, sessionId, CurrentSessionId(), cancellationToken);
        return result.Status == UserOpStatus.Ok ? Ok(new { message = "Session revoked." }) : ToActionResult(result);
    }

    [HttpPost("{id:guid}/sessions/revoke-all")]
    public async Task<IActionResult> RevokeAllSessions(Guid id, CancellationToken cancellationToken)
    {
        var result = await _users.RevokeAllSessionsAsync(id, ActorId(), CurrentSessionId(), cancellationToken);
        return result.Status == UserOpStatus.Ok ? Ok(new { message = "All sessions revoked." }) : ToActionResult(result);
    }

    /// <summary>The member's history: what they did (sign-ins, edits) and what was done to their account (revoked sessions, role changes).</summary>
    [HttpGet("{id:guid}/activity")]
    public async Task<ActionResult<ActivityLogPage>> GetActivity(
        Guid id,
        [FromQuery] ActivityLogQuery query,
        [FromServices] IValidator<ActivityLogQuery> validator,
        CancellationToken cancellationToken)
    {
        // The route decides whose history this is, whatever the query string says.
        query.UserId = null;
        query.InvolvingUserId = id;

        var validation = await validator.ValidateAsync(query, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        if (await _users.GetMemberAsync(id, cancellationToken) == null) return NotFound(new { message = "Member not found." });

        return Ok(await _adminService.GetActivityLogsAsync(query, cancellationToken));
    }

    /// <summary>The session the caller is signed in with (the "sid" claim), or null.</summary>
    private Guid? CurrentSessionId() =>
        Guid.TryParse(User.FindFirstValue("sid"), out var id) ? id : null;

    private Guid ActorId() =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    /// <summary>Maps an operation result to HTTP: 404, 409 for a safety rule, 400 for a request that cannot be done.</summary>
    private ActionResult ToActionResult<T>(UserOpResult<T> result) => result.Status switch
    {
        UserOpStatus.Ok => Ok(result.Value),
        UserOpStatus.NotFound => NotFound(new { message = result.Message }),
        UserOpStatus.Blocked => Conflict(new { message = result.Message }),
        _ => BadRequest(new { message = result.Message, errors = result.Errors })
    };
}
