using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;
using Portfolio.API.Infrastructure.Logging;
using Portfolio.API.Infrastructure.Querying;

namespace Portfolio.API.Features.Users;

public enum UserOpStatus
{
    Ok,
    NotFound,

    /// <summary>A safety rule stopped the action (the owner account, yourself, the last admin).</summary>
    Blocked,

    /// <summary>The request cannot be done as asked (duplicate email, wrong state).</summary>
    Invalid
}

public record UserOpResult<T>(UserOpStatus Status, T? Value = default, string? Message = null, IDictionary<string, string[]>? Errors = null)
{
    public static UserOpResult<T> Ok(T value) => new(UserOpStatus.Ok, value);
    public static UserOpResult<T> NotFound() => new(UserOpStatus.NotFound, Message: "Member not found.");
    public static UserOpResult<T> Blocked(string message) => new(UserOpStatus.Blocked, Message: message);
    public static UserOpResult<T> Invalid(string message, IDictionary<string, string[]>? errors = null) => new(UserOpStatus.Invalid, Message: message, Errors: errors);
}

public interface IUserAdminService
{
    Task<MemberPage> GetMembersAsync(MemberQuery query, CancellationToken cancellationToken = default);
    Task<MemberDto?> GetMemberAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserOpResult<MemberActionResult>> CreateAsync(MemberCreateDto dto, CancellationToken cancellationToken = default);
    Task<UserOpResult<MemberActionResult>> UpdateAsync(Guid id, MemberUpdateDto dto, Guid actorId, CancellationToken cancellationToken = default);
    Task<UserOpResult<MemberDto>> SetActiveAsync(Guid id, bool active, Guid actorId, CancellationToken cancellationToken = default);
    Task<UserOpResult<MemberDto>> SoftDeleteAsync(Guid id, Guid actorId, CancellationToken cancellationToken = default);
    Task<UserOpResult<MemberDto>> RestoreAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserOpResult<bool>> EraseAsync(Guid id, string confirmEmail, Guid actorId, CancellationToken cancellationToken = default);
    Task<UserOpResult<bool>> ResendInviteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserOpResult<bool>> SendPasswordResetAsync(Guid id, CancellationToken cancellationToken = default);
    /// <summary>Sessions of a member. currentSessionId is the caller's own session, so it can be marked as "this device".</summary>
    Task<UserOpResult<List<UserSessionDto>>> GetSessionsAsync(Guid id, bool includeEnded, Guid? currentSessionId, CancellationToken cancellationToken = default);

    /// <summary>Revokes one session. The caller's own current session is refused: signing yourself out is "Sign out".</summary>
    Task<UserOpResult<bool>> RevokeSessionAsync(Guid id, Guid sessionId, Guid? currentSessionId, CancellationToken cancellationToken = default);

    /// <summary>Revokes every session of a member. On the caller's own account the current session is kept.</summary>
    Task<UserOpResult<bool>> RevokeAllSessionsAsync(Guid id, Guid actorId, Guid? currentSessionId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Everything the SuperAdmin can do to members. Safety rules live here, in one place:
/// the owner account (the configured Admin:Email) cannot be changed, nobody can act on their own account,
/// and the last active admin cannot be removed.
/// </summary>
public class UserAdminService : IUserAdminService
{
    /// <summary>What replaces a member's email in old log entries after a permanent erase.</summary>
    private const string ErasedMarker = "erased user";

    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ISessionManager _sessionManager;
    private readonly IAccountService _accountService;
    private readonly IActivityLogger _activityLogger;
    private readonly IConfiguration _configuration;

    public UserAdminService(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        ISessionManager sessionManager,
        IAccountService accountService,
        IActivityLogger activityLogger,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _sessionManager = sessionManager;
        _accountService = accountService;
        _activityLogger = activityLogger;
        _configuration = configuration;
    }

    // ---- reading ---------------------------------------------------------------------------------

    public async Task<MemberPage> GetMembersAsync(MemberQuery query, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var users = _context.Users.AsNoTracking().AsQueryable();

        // Without a status, deleted members are hidden (like archived messages in the inbox).
        users = users.Where(UserStatuses.Filter(query.Status) ?? UserStatuses.WhereNotDeleted);

        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            var role = UserRoles.All.First(r => r.Equals(query.Role.Trim(), StringComparison.OrdinalIgnoreCase));
            users = users.Where(u => u.Role == role);
        }

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = $"%{LikeEscaper.Escape(search)}%";
            users = users.Where(u =>
                EF.Functions.ILike(u.FullName, pattern, LikeEscaper.EscapeCharacter) ||
                (u.Email != null && EF.Functions.ILike(u.Email, pattern, LikeEscaper.EscapeCharacter)) ||
                (u.UserName != null && EF.Functions.ILike(u.UserName, pattern, LikeEscaper.EscapeCharacter)));
        }

        var totalCount = await users.CountAsync(cancellationToken);

        var items = await users
            .OrderByDescending(u => u.LastLoginAt.HasValue)
            .ThenByDescending(u => u.LastLoginAt)
            .ThenByDescending(u => u.CreatedAt)
            .ThenByDescending(u => u.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(u => new MemberDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? "",
                UserName = u.UserName ?? "",
                Role = u.Role,
                EmailConfirmed = u.EmailConfirmed,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                LastLoginMethod = u.LastLoginMethod,
                LastLoginIp = u.LastLoginIp,
                DeletedAt = u.DeletedAt,
                ActiveSessions = _context.UserSessions.Count(s => s.UserId == u.Id && !s.IsRevoked && s.ExpiresAt > now)
            })
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.Status = UserStatuses.Of(item.DeletedAt, item.IsActive, item.EmailConfirmed);
            item.IsSuperAdmin = IsSuperAdmin(item.Email);
        }

        return new MemberPage
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
            Stats = await GetStatsAsync(cancellationToken)
        };
    }

    public async Task<MemberDto?> GetMemberAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        return user == null ? null : await ToDtoAsync(user, cancellationToken);
    }

    /// <summary>
    /// Counts for the whole table. One query reads the few columns that matter and the counts are made here,
    /// so the status rule (<see cref="UserStatuses.Of(DateTime?, bool, bool)"/>) exists once. Fine for the
    /// size of a personal site; if the table grows to many thousands, aggregate in SQL or cache the result.
    /// </summary>
    private async Task<MemberStats> GetStatsAsync(CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        var rows = await _context.Users.AsNoTracking()
            .Select(u => new { u.DeletedAt, u.IsActive, u.EmailConfirmed, u.Role, u.LastLoginAt })
            .ToListAsync(cancellationToken);

        var stats = new MemberStats();
        foreach (var row in rows)
        {
            var status = UserStatuses.Of(row.DeletedAt, row.IsActive, row.EmailConfirmed);
            if (status == UserStatuses.Deleted)
            {
                stats.Deleted++;
                continue;
            }

            stats.TotalUsers++;
            if (status == UserStatuses.Active) stats.Active++;
            else if (status == UserStatuses.Pending) stats.Pending++;
            else stats.Inactive++;

            if (UserRoles.IsAdminCapable(row.Role)) stats.Admins++;
            else if (row.Role == UserRoles.Member) stats.Members++;

            if (row.LastLoginAt >= since) stats.LoggedInLast30Days++;
        }

        return stats;
    }

    // ---- create and edit -------------------------------------------------------------------------

    public async Task<UserOpResult<MemberActionResult>> CreateAsync(MemberCreateDto dto, CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = dto.FullName.Trim(),
            Role = dto.Role,
            EmailConfirmed = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // No password: the member chooses one through the invite link.
        var created = await _userManager.CreateAsync(user);
        if (!created.Succeeded)
        {
            return UserOpResult<MemberActionResult>.Invalid("The member could not be created.", ToFieldErrors(created));
        }

        await _userManager.AddToRoleAsync(user, dto.Role);
        await _activityLogger.LogAsync("USER_CREATE", "User", user.Id.ToString(), $"Added member {user.FullName} ({email}) as {dto.Role}.");

        var sent = await _accountService.SendActivationEmailAsync(user, cancellationToken);
        await _activityLogger.LogAsync("USER_INVITE", "User", user.Id.ToString(), sent ? $"Invite sent to {email}." : $"Invite to {email} could not be sent.");

        return UserOpResult<MemberActionResult>.Ok(new MemberActionResult { Member = await ToDtoAsync(user, cancellationToken), EmailSent = sent });
    }

    public async Task<UserOpResult<MemberActionResult>> UpdateAsync(Guid id, MemberUpdateDto dto, Guid actorId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<MemberActionResult>.NotFound();
        if (user.DeletedAt != null) return UserOpResult<MemberActionResult>.Invalid("Restore this member before editing.");

        var blocked = await BlockReasonAsync(user, actorId, UserAction.Change, demoting: dto.Role == UserRoles.Member);
        if (blocked != null) return UserOpResult<MemberActionResult>.Blocked(blocked);

        var email = dto.Email.Trim();
        var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
        if (emailChanged)
        {
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing != null && existing.Id != user.Id)
            {
                return UserOpResult<MemberActionResult>.Invalid("This email is already used by another member.",
                    new Dictionary<string, string[]> { ["email"] = ["This email is already used by another member."] });
            }
        }

        var roleChanged = user.Role != dto.Role;
        var previousRole = user.Role;

        // The email, username and role are separate Identity calls. They run in one transaction, so a failure
        // in the middle cannot leave a half-changed member.
        await using (var transaction = await _context.Database.BeginTransactionAsync(cancellationToken))
        {
            user.FullName = dto.FullName.Trim();

            if (emailChanged)
            {
                // The new address has to be confirmed again before the member can sign in.
                var failure = Failed(await _userManager.SetEmailAsync(user, email))
                              ?? Failed(await _userManager.SetUserNameAsync(user, email));
                if (failure != null) return UserOpResult<MemberActionResult>.Invalid("The member could not be saved.", failure);
                user.EmailConfirmed = false;
            }

            if (roleChanged)
            {
                var failure = Failed(await _userManager.RemoveFromRoleAsync(user, previousRole))
                              ?? Failed(await _userManager.AddToRoleAsync(user, dto.Role));
                if (failure != null) return UserOpResult<MemberActionResult>.Invalid("The member could not be saved.", failure);
                user.Role = dto.Role;
            }

            var updated = Failed(await _userManager.UpdateAsync(user));
            if (updated != null) return UserOpResult<MemberActionResult>.Invalid("The member could not be saved.", updated);

            await transaction.CommitAsync(cancellationToken);
        }

        var sent = false;
        if (emailChanged || roleChanged)
        {
            // Roles and the email live in the sign-in cookie, so the member signs in again to get the change.
            await EndAllSessionsAsync(user);
        }

        if (emailChanged) sent = await _accountService.SendActivationEmailAsync(user, cancellationToken);

        await _activityLogger.LogAsync("USER_UPDATE", "User", user.Id.ToString(), $"Updated member {user.FullName} ({user.Email}).");
        if (roleChanged)
        {
            await _activityLogger.LogAsync("USER_ROLE_CHANGE", "User", user.Id.ToString(), $"Changed {user.Email} from {previousRole} to {dto.Role}.");
        }

        return UserOpResult<MemberActionResult>.Ok(new MemberActionResult { Member = await ToDtoAsync(user, cancellationToken), EmailSent = sent });
    }

    // ---- turning off, deleting, restoring, erasing -----------------------------------------------

    public async Task<UserOpResult<MemberDto>> SetActiveAsync(Guid id, bool active, Guid actorId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<MemberDto>.NotFound();
        if (user.DeletedAt != null) return UserOpResult<MemberDto>.Invalid("Restore this member first.");

        if (!active)
        {
            var blocked = await BlockReasonAsync(user, actorId, UserAction.Deactivate, demoting: true);
            if (blocked != null) return UserOpResult<MemberDto>.Blocked(blocked);
        }

        user.IsActive = active;
        await _userManager.UpdateAsync(user);
        if (!active) await EndAllSessionsAsync(user);

        await _activityLogger.LogAsync(active ? "USER_ACTIVATE" : "USER_DEACTIVATE", "User", user.Id.ToString(),
            active ? $"Activated {user.Email}." : $"Deactivated {user.Email} and ended their sessions.");

        return UserOpResult<MemberDto>.Ok(await ToDtoAsync(user, cancellationToken));
    }

    public async Task<UserOpResult<MemberDto>> SoftDeleteAsync(Guid id, Guid actorId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<MemberDto>.NotFound();
        if (user.DeletedAt != null) return UserOpResult<MemberDto>.Invalid("This member is already deleted.");

        var blocked = await BlockReasonAsync(user, actorId, UserAction.Delete, demoting: true);
        if (blocked != null) return UserOpResult<MemberDto>.Blocked(blocked);

        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        await _userManager.UpdateAsync(user);
        await EndAllSessionsAsync(user);

        await _activityLogger.LogAsync("USER_DELETE", "User", user.Id.ToString(), $"Deleted member {user.Email} (can be restored).");
        return UserOpResult<MemberDto>.Ok(await ToDtoAsync(user, cancellationToken));
    }

    public async Task<UserOpResult<MemberDto>> RestoreAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<MemberDto>.NotFound();
        if (user.DeletedAt == null) return UserOpResult<MemberDto>.Invalid("This member is not deleted.");

        user.DeletedAt = null;
        user.IsActive = true;
        await _userManager.UpdateAsync(user);

        await _activityLogger.LogAsync("USER_RESTORE", "User", user.Id.ToString(), $"Restored member {user.Email}.");
        return UserOpResult<MemberDto>.Ok(await ToDtoAsync(user, cancellationToken));
    }

    public async Task<UserOpResult<bool>> EraseAsync(Guid id, string confirmEmail, Guid actorId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<bool>.NotFound();

        var blocked = await BlockReasonAsync(user, actorId, UserAction.Erase, demoting: true);
        if (blocked != null) return UserOpResult<bool>.Blocked(blocked);

        var email = user.Email ?? string.Empty;
        if (!string.Equals(email, confirmEmail.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return UserOpResult<bool>.Invalid("The email does not match this member.",
                new Dictionary<string, string[]> { ["confirmEmail"] = ["The email does not match this member."] });
        }

        var idText = user.Id.ToString();
        var emailLower = email.ToLowerInvariant();
        var fullName = user.FullName.Trim();
        var scrubName = fullName.Length > 0;

        // All or nothing: either the member is gone and their traces are scrubbed, or nothing changed.
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        // Entries written by the member lose the email, IP address and device.
        await _context.ActivityLogs
            .Where(a => a.UserId == user.Id || a.UserEmail == email)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.UserEmail, ErasedMarker)
                .SetProperty(a => a.IpAddress, string.Empty)
                .SetProperty(a => a.DeviceInfo, string.Empty), cancellationToken);

        // Entries about the member ("Added member Ann (ann@...)") lose the email and the name. The name is only
        // replaced in these entries, which we wrote ourselves, so other text is never touched.
        await _context.ActivityLogs
            .Where(a => a.EntityId == idText)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Summary, a => scrubName
                    ? a.Summary.Replace(email, ErasedMarker).Replace(fullName, ErasedMarker)
                    : a.Summary.Replace(email, ErasedMarker))
                .SetProperty(a => a.DetailsJson, a => scrubName
                    ? a.DetailsJson!.Replace(email, ErasedMarker).Replace(fullName, ErasedMarker)
                    : a.DetailsJson!.Replace(email, ErasedMarker)), cancellationToken);

        // Any other entry that happens to contain the email loses just the email.
        await _context.ActivityLogs
            .Where(a => a.EntityId != idText && (a.Summary.Contains(email) || (a.DetailsJson != null && a.DetailsJson.Contains(email))))
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Summary, a => a.Summary.Replace(email, ErasedMarker))
                .SetProperty(a => a.DetailsJson, a => a.DetailsJson!.Replace(email, ErasedMarker)), cancellationToken);

        // Contact messages and repo requests the person sent from this address.
        await _context.ContactInquiries
            .Where(i => i.Email.ToLower() == emailLower)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.Name, ErasedMarker)
                .SetProperty(i => i.Email, "erased@erased.invalid")
                .SetProperty(i => i.Subject, "[erased]")
                .SetProperty(i => i.Message, "[erased]"), cancellationToken);

        // Error log lines that quote the email, and files they uploaded keep no link to them.
        await _context.SystemLogs
            .Where(l => l.Message.Contains(email) || (l.Exception != null && l.Exception.Contains(email)))
            .ExecuteUpdateAsync(s => s
                .SetProperty(l => l.Message, l => l.Message.Replace(email, ErasedMarker))
                .SetProperty(l => l.Exception, l => l.Exception!.Replace(email, ErasedMarker)), cancellationToken);

        await _context.MediaAssets
            .Where(m => m.UploadedByUserId == user.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.UploadedByUserId, (Guid?)null), cancellationToken);

        var deleted = await _userManager.DeleteAsync(user);
        if (!deleted.Succeeded)
        {
            return UserOpResult<bool>.Invalid("The member could not be erased.", ToFieldErrors(deleted));
        }

        await transaction.CommitAsync(cancellationToken);

        // The summary holds no personal data: the account no longer exists.
        await _activityLogger.LogAsync("USER_ERASE", "User", idText, "A member was erased permanently and their log entries were anonymized.");
        return UserOpResult<bool>.Ok(true);
    }

    // ---- emails ----------------------------------------------------------------------------------

    public async Task<UserOpResult<bool>> ResendInviteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<bool>.NotFound();
        if (user.DeletedAt != null || !user.IsActive) return UserOpResult<bool>.Invalid("This member is not active.");
        if (user.EmailConfirmed) return UserOpResult<bool>.Invalid("This member has already confirmed their email.");

        var sent = await _accountService.SendActivationEmailAsync(user, cancellationToken);
        await _activityLogger.LogAsync("USER_INVITE", "User", user.Id.ToString(), sent ? $"Invite sent again to {user.Email}." : $"Invite to {user.Email} could not be sent.");
        return UserOpResult<bool>.Ok(sent);
    }

    public async Task<UserOpResult<bool>> SendPasswordResetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return UserOpResult<bool>.NotFound();
        if (IsSuperAdmin(user.Email)) return UserOpResult<bool>.Blocked("The SuperAdmin account cannot be changed.");
        if (user.DeletedAt != null || !user.IsActive) return UserOpResult<bool>.Invalid("This member is not active.");

        var sent = await _accountService.SendPasswordResetEmailAsync(user, cancellationToken);
        await _activityLogger.LogAsync("USER_PASSWORD_RESET", "User", user.Id.ToString(), sent ? $"Password reset link sent to {user.Email}." : $"Password reset link to {user.Email} could not be sent.");
        return UserOpResult<bool>.Ok(sent);
    }

    // ---- sessions --------------------------------------------------------------------------------

    public async Task<UserOpResult<List<UserSessionDto>>> GetSessionsAsync(Guid id, bool includeEnded, Guid? currentSessionId, CancellationToken cancellationToken = default)
    {
        var owner = await _context.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new { u.Email })
            .FirstOrDefaultAsync(cancellationToken);
        if (owner == null) return UserOpResult<List<UserSessionDto>>.NotFound();

        // The caller's own session is marked, but only when they look at their own row (the list is one member's sessions).
        var sessions = await _sessionManager.GetUserSessionsAsync(id, currentSessionId, includeEnded);
        foreach (var session in sessions) session.UserEmail = owner.Email ?? "";

        // The session you are using comes first.
        return UserOpResult<List<UserSessionDto>>.Ok(sessions.OrderByDescending(s => s.IsCurrent).ToList());
    }

    public async Task<UserOpResult<bool>> RevokeSessionAsync(Guid id, Guid sessionId, Guid? currentSessionId, CancellationToken cancellationToken = default)
    {
        if (currentSessionId.HasValue && sessionId == currentSessionId.Value)
        {
            return UserOpResult<bool>.Blocked("This is the session you are using. Use Sign out instead.");
        }

        // Passing the member's id makes the session manager refuse a session that belongs to someone else.
        var revoked = await _sessionManager.RevokeSessionAsync(sessionId, id, isAdmin: false);
        if (!revoked) return UserOpResult<bool>.NotFound();

        await _activityLogger.LogAsync("SESSION_REVOKE", "User", id.ToString(), "A session was revoked by the owner.");
        return UserOpResult<bool>.Ok(true);
    }

    public async Task<UserOpResult<bool>> RevokeAllSessionsAsync(Guid id, Guid actorId, Guid? currentSessionId, CancellationToken cancellationToken = default)
    {
        if (!await _context.Users.AnyAsync(u => u.Id == id, cancellationToken)) return UserOpResult<bool>.NotFound();

        // On your own account, the session you are using stays: you are revoking "all the others".
        var keep = id == actorId ? currentSessionId : null;
        await _sessionManager.RevokeAllUserSessionsAsync(id, keep);
        await _activityLogger.LogAsync("USER_SESSIONS_REVOKE_ALL", "User", id.ToString(),
            keep.HasValue ? "All other sessions of the owner were revoked." : "All sessions of the member were revoked by the owner.");
        return UserOpResult<bool>.Ok(true);
    }

    // ---- safety rules and helpers ----------------------------------------------------------------

    /// <summary>The owner account is the one whose email is the configured Admin:Email.</summary>
    private bool IsSuperAdmin(string? email)
    {
        var configured = _configuration["Admin:Email"] ?? _configuration["SuperAdmin:Email"];
        return !string.IsNullOrWhiteSpace(configured)
               && string.Equals(email, configured.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>The actions the safety rules apply to, with the words used in the messages.</summary>
    private sealed record UserAction(string Base, string Past)
    {
        public static readonly UserAction Change = new("change", "changed");
        public static readonly UserAction Deactivate = new("deactivate", "deactivated");
        public static readonly UserAction Delete = new("delete", "deleted");
        public static readonly UserAction Erase = new("erase", "erased");
    }

    /// <summary>Why the action must not happen, or null when it is allowed.</summary>
    private async Task<string?> BlockReasonAsync(ApplicationUser target, Guid actorId, UserAction action, bool demoting)
    {
        if (IsSuperAdmin(target.Email)) return $"The SuperAdmin account cannot be {action.Past}.";
        if (target.Id == actorId) return $"You cannot {action.Base} your own account.";

        // Taking away the last admin would lock everyone out of the admin area.
        if (demoting && UserRoles.IsAdminCapable(target.Role))
        {
            var anotherAdmin = await _context.Users.AnyAsync(u =>
                u.Id != target.Id && u.DeletedAt == null && u.IsActive && u.EmailConfirmed
                && (u.Role == UserRoles.SuperAdmin || u.Role == UserRoles.Admin));
            if (!anotherAdmin) return $"This is the last active admin, so it cannot be {action.Past}.";
        }

        return null;
    }

    /// <summary>Signs the member out everywhere. Used after anything that changes what they may do.</summary>
    private async Task EndAllSessionsAsync(ApplicationUser user)
    {
        await _sessionManager.RevokeAllUserSessionsAsync(user.Id);
        await _userManager.UpdateSecurityStampAsync(user);
    }

    private async Task<MemberDto> ToDtoAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var activeSessions = await _context.UserSessions.CountAsync(
            s => s.UserId == user.Id && !s.IsRevoked && s.ExpiresAt > now, cancellationToken);

        return new MemberDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? "",
            UserName = user.UserName ?? "",
            Role = user.Role,
            Status = UserStatuses.Of(user),
            IsSuperAdmin = IsSuperAdmin(user.Email),
            EmailConfirmed = user.EmailConfirmed,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            LastLoginMethod = user.LastLoginMethod,
            LastLoginIp = user.LastLoginIp,
            DeletedAt = user.DeletedAt,
            ActiveSessions = activeSessions
        };
    }

    /// <summary>The field errors of a failed Identity call, or null when it succeeded.</summary>
    private static IDictionary<string, string[]>? Failed(IdentityResult result) => result.Succeeded ? null : ToFieldErrors(result);

    private static IDictionary<string, string[]> ToFieldErrors(IdentityResult result)
    {
        var errors = new Dictionary<string, List<string>>();
        foreach (var error in result.Errors)
        {
            var key = error.Code.Contains("Email", StringComparison.Ordinal) || error.Code.Contains("UserName", StringComparison.Ordinal)
                ? "email"
                : "general";
            var message = key == "email" && error.Code.StartsWith("Duplicate", StringComparison.Ordinal)
                ? "A member with this email already exists."
                : error.Description;
            if (!errors.TryGetValue(key, out var list)) errors[key] = list = new List<string>();
            list.Add(message);
        }

        return errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
    }
}
