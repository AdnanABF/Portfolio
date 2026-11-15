namespace Portfolio.API.Features.Auth;

/// <summary>Public sign-up form. <see cref="ContactPrefUrl"/> and <see cref="FillTimeMs"/> are bot traps, not real fields.</summary>
public class RegisterRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Hidden field a person never fills in. Anything in here means a bot. The name is deliberately not
    /// "website" or "url": browsers and password managers autofill those.
    /// </summary>
    public string? ContactPrefUrl { get; set; }

    /// <summary>
    /// How long the form was open, in milliseconds, measured by the browser. Submitting within a few seconds
    /// means a bot. An elapsed time is used, not a timestamp, so a visitor's wrong clock cannot make them look like one.
    /// </summary>
    public long? FillTimeMs { get; set; }
}

public class VerifyEmailRequest
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
}

/// <summary>Used to accept an invite and to finish a password reset: both prove mailbox ownership with a token.</summary>
public class SetPasswordRequest
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class EmailRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;
}

/// <summary>Outcome of an account operation. <see cref="Errors"/> are field messages for a 400 response.</summary>
public record AccountResult(bool Succeeded, string? Message = null, IDictionary<string, string[]>? Errors = null)
{
    public static AccountResult Ok(string? message = null) => new(true, message);
    public static AccountResult Fail(string message, IDictionary<string, string[]>? errors = null) => new(false, message, errors);
}
