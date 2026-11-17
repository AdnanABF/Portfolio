using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Contact;
using Portfolio.API.Infrastructure.Email;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Auth;

public interface IAccountService
{
    /// <summary>Public sign-up. The result never says whether the email was already registered.</summary>
    Task<AccountResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<AccountResult> VerifyEmailAsync(Guid userId, string token);

    /// <summary>Accepts an invite or finishes a password reset: the token proves the person owns the mailbox.</summary>
    Task<AccountResult> SetPasswordWithTokenAsync(Guid userId, string token, string newPassword);

    /// <summary>Sends a reset link when the account exists and is usable. Does nothing visible otherwise.</summary>
    Task ForgotPasswordAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>Sends the activation email again for an account that has not confirmed its email yet.</summary>
    Task ResendVerificationAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends the right activation email for the account: an invite when it has no password yet (created by the
    /// owner), a verification link when the person chose a password at sign-up. False when the email failed to send.
    /// </summary>
    Task<bool> SendActivationEmailAsync(ApplicationUser user, CancellationToken cancellationToken = default);

    Task<bool> SendPasswordResetEmailAsync(ApplicationUser user, CancellationToken cancellationToken = default);

    Task<AccountResult> ChangePasswordAsync(ApplicationUser user, string currentPassword, string newPassword, HttpContext httpContext);

    Task<UserDto?> UpdateProfileAsync(Guid userId, string fullName);
}

public class AccountService : IAccountService
{
    /// <summary>Minimum time a person needs to fill in the sign-up form. Faster than this is a bot.</summary>
    private static readonly TimeSpan MinimumFillTime = TimeSpan.FromSeconds(3);

    /// <summary>
    /// Public "send me a link" requests for the same address are answered at most this often. Without it,
    /// anyone could use the forms to flood a victim's inbox (the per-IP limit alone allows 10 emails per window).
    /// </summary>
    private static readonly TimeSpan MailCooldown = TimeSpan.FromMinutes(2);

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ISessionManager _sessionManager;
    private readonly IEmailSender _emailSender;
    private readonly ResendOptions _emailOptions;
    private readonly IConfiguration _configuration;
    private readonly IActivityLogger _activityLogger;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AccountService> _logger;

    public AccountService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ISessionManager sessionManager,
        IEmailSender emailSender,
        IOptions<ResendOptions> emailOptions,
        IConfiguration configuration,
        IActivityLogger activityLogger,
        IMemoryCache cache,
        ILogger<AccountService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _sessionManager = sessionManager;
        _emailSender = emailSender;
        _emailOptions = emailOptions.Value;
        _configuration = configuration;
        _activityLogger = activityLogger;
        _cache = cache;
        _logger = logger;
    }

    public async Task<AccountResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var neutral = AccountResult.Ok("If this email can be registered, a confirmation link is on its way.");

        // Bot traps: a filled hidden field, or a form submitted faster than a person can type. The bot gets
        // the same friendly answer, so it learns nothing.
        if (!string.IsNullOrWhiteSpace(request.ContactPrefUrl) || LooksTooFast(request.FillTimeMs))
        {
            return neutral;
        }

        var email = request.Email.Trim();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            Role = UserRoles.Member,
            EmailConfirmed = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            // An address that is already taken must look like success, or the form would reveal who has an account.
            var onlyDuplicates = created.Errors.All(e => e.Code is "DuplicateEmail" or "DuplicateUserName");
            return onlyDuplicates ? neutral : AccountResult.Fail("Please check the form.", ToFieldErrors(created));
        }

        await _userManager.AddToRoleAsync(user, UserRoles.Member);
        await _activityLogger.LogAsync("USER_REGISTER", "User", user.Id.ToString(), $"New member signed up: {user.Email}");
        await SendActivationEmailAsync(user, cancellationToken);

        return neutral;
    }

    public async Task<AccountResult> VerifyEmailAsync(Guid userId, string token)
    {
        var user = await FindUsableAsync(userId);
        var decoded = DecodeToken(token);
        if (user == null || decoded == null) return InvalidLink();

        var result = await _userManager.ConfirmEmailAsync(user, decoded);
        if (!result.Succeeded) return InvalidLink();

        await _activityLogger.LogAsync("USER_EMAIL_VERIFIED", "User", user.Id.ToString(), $"Email verified: {user.Email}");
        return AccountResult.Ok("Your email is confirmed. You can sign in now.");
    }

    public async Task<AccountResult> SetPasswordWithTokenAsync(Guid userId, string token, string newPassword)
    {
        var user = await FindUsableAsync(userId);
        var decoded = DecodeToken(token);
        if (user == null || decoded == null) return InvalidLink();

        var result = await _userManager.ResetPasswordAsync(user, decoded, newPassword);
        if (!result.Succeeded)
        {
            // A bad token and a weak password are different problems. Only the weak password is the person's to fix.
            var tokenProblem = result.Errors.Any(e => e.Code == "InvalidToken");
            return tokenProblem ? InvalidLink() : AccountResult.Fail("Please choose a stronger password.", ToFieldErrors(result, "password"));
        }

        // The link came from the person's inbox, so this also proves they own the address.
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        // Anyone who knew the old password is signed out.
        await _sessionManager.RevokeAllUserSessionsAsync(user.Id);
        await _activityLogger.LogAsync("USER_PASSWORD_RESET", "User", user.Id.ToString(), $"Password set through an email link: {user.Email}");
        return AccountResult.Ok("Your password is saved. You can sign in now.");
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.DeletedAt != null || !user.IsActive) return;
        if (!TryStartMailCooldown("reset", user.Email!)) return;

        await SendPasswordResetEmailAsync(user, cancellationToken);
    }

    public async Task ResendVerificationAsync(string email, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.DeletedAt != null || !user.IsActive || user.EmailConfirmed) return;
        if (!TryStartMailCooldown("activation", user.Email!)) return;

        await SendActivationEmailAsync(user, cancellationToken);
    }

    public async Task<bool> SendActivationEmailAsync(ApplicationUser user, CancellationToken cancellationToken = default)
    {
        var hasPassword = await _userManager.HasPasswordAsync(user);

        // An invited account has no password, so its link goes to the "set your password" page.
        // A signed-up account only needs its address confirmed.
        if (!hasPassword)
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var content = AccountEmailTemplates.Invite(user.FullName, BuildLink("accept-invite", user, token));
            return await SendAsync(user, content, "invite", cancellationToken);
        }

        var confirmToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var verify = AccountEmailTemplates.VerifyEmail(user.FullName, BuildLink("verify-email", user, confirmToken));
        return await SendAsync(user, verify, "verification", cancellationToken);
    }

    public async Task<bool> SendPasswordResetEmailAsync(ApplicationUser user, CancellationToken cancellationToken = default)
    {
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var content = AccountEmailTemplates.ResetPassword(user.FullName, BuildLink("reset-password", user, token));
        return await SendAsync(user, content, "password reset", cancellationToken);
    }

    public async Task<AccountResult> ChangePasswordAsync(ApplicationUser user, string currentPassword, string newPassword, HttpContext httpContext)
    {
        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        if (!result.Succeeded)
        {
            var wrongCurrent = result.Errors.Any(e => e.Code == "PasswordMismatch");
            return wrongCurrent
                ? AccountResult.Fail("Your current password is not correct.", new Dictionary<string, string[]> { ["currentPassword"] = ["Your current password is not correct."] })
                : AccountResult.Fail("Please choose a stronger password.", ToFieldErrors(result, "newPassword"));
        }

        // Other devices are signed out. This device stays signed in: Identity changed the security stamp, so the
        // cookie is renewed with the new stamp and the same session id.
        Guid.TryParse(httpContext.User.FindFirst("sid")?.Value, out var currentSessionId);
        var others = await _sessionManager.GetUserSessionsAsync(user.Id, currentSessionId, includeEnded: false);
        foreach (var session in others.Where(s => !s.IsCurrent))
        {
            await _sessionManager.RevokeSessionAsync(session.Id, user.Id, isAdmin: false);
        }

        if (currentSessionId != Guid.Empty)
        {
            await _signInManager.SignInWithClaimsAsync(user, isPersistent: true, new[] { new Claim("sid", currentSessionId.ToString()) });
        }

        await _activityLogger.LogAsync("USER_PASSWORD_CHANGE", "User", user.Id.ToString(), "Password changed.");
        return AccountResult.Ok("Your password is changed. Other devices were signed out.");
    }

    public async Task<UserDto?> UpdateProfileAsync(Guid userId, string fullName)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;

        var previousName = user.FullName;
        user.FullName = fullName.Trim();
        await _userManager.UpdateAsync(user);
        await _activityLogger.LogAsync("USER_PROFILE_UPDATE", "User", user.Id.ToString(), $"Name changed from \"{previousName}\" to \"{user.FullName}\".");

        var roles = await _userManager.GetRolesAsync(user);
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = roles.FirstOrDefault() ?? user.Role,
            Roles = roles,
            IsAdmin = roles.Any(UserRoles.IsAdminCapable),
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    // ---- helpers ---------------------------------------------------------------------------------

    private static bool LooksTooFast(long? fillTimeMs)
    {
        // A missing time is treated like a bot: the real form always sends it.
        return fillTimeMs == null || TimeSpan.FromMilliseconds(fillTimeMs.Value) < MinimumFillTime;
    }

    /// <summary>True when no link was sent to this address for this purpose in the last couple of minutes (and starts the wait).</summary>
    private bool TryStartMailCooldown(string purpose, string email)
    {
        var key = $"mail-cooldown:{purpose}:{email.Trim().ToLowerInvariant()}";
        if (_cache.TryGetValue(key, out _)) return false;

        _cache.Set(key, true, MailCooldown);
        return true;
    }

    /// <summary>The user behind a link, only when the account can still use it (exists, not deleted, not turned off).</summary>
    private async Task<ApplicationUser?> FindUsableAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        return user == null || user.DeletedAt != null || !user.IsActive ? null : user;
    }

    private static AccountResult InvalidLink() =>
        AccountResult.Fail("This link is invalid or has expired. Ask for a new one.");

    private string BuildLink(string page, ApplicationUser user, string token)
    {
        var baseUrl = _configuration["App:PublicBaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault() ?? "http://localhost:3000";
        }

        var encoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        return $"{baseUrl.TrimEnd('/')}/{page}?uid={user.Id}&token={encoded}";
    }

    private static string? DecodeToken(string token)
    {
        try
        {
            return Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private async Task<bool> SendAsync(ApplicationUser user, EmailContent content, string kind, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.Email)) return false;

        var fromAddress = string.IsNullOrWhiteSpace(_emailOptions.FromAddress) ? "noreply@localhost" : _emailOptions.FromAddress;
        var from = string.IsNullOrWhiteSpace(_emailOptions.FromName)
            ? fromAddress
            : $"{ContactEmailTemplates.SingleLine(_emailOptions.FromName, 80).Replace("\"", string.Empty).Replace("<", string.Empty).Replace(">", string.Empty)} <{fromAddress}>";

        try
        {
            await _emailSender.SendAsync(
                new EmailMessage(
                    From: from,
                    To: user.Email,
                    Subject: _emailOptions.SubjectPrefix + content.Subject,
                    Html: content.Html,
                    Text: content.Text),
                cancellationToken);
            return true;
        }
        catch (EmailSendException ex)
        {
            // The account exists either way. The owner can send the email again from the members panel.
            _logger.LogError(ex, "The {Kind} email for user {UserId} could not be sent.", kind, user.Id);
            return false;
        }
    }

    private static IDictionary<string, string[]> ToFieldErrors(IdentityResult result, string passwordField = "password")
    {
        var errors = new Dictionary<string, List<string>>();
        foreach (var error in result.Errors)
        {
            var key = error.Code.StartsWith("Password", StringComparison.Ordinal) ? passwordField
                : error.Code.Contains("Email", StringComparison.Ordinal) ? "email"
                : "general";
            if (!errors.TryGetValue(key, out var list)) errors[key] = list = new List<string>();
            list.Add(error.Description);
        }

        return errors.ToDictionary(e => e.Key, e => e.Value.ToArray());
    }
}
