using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Auth;

/// <summary>
/// Sign-up, email verification, invites, password reset and the signed-in member's own profile.
/// The public endpoints are rate limited and never reveal whether an email has an account.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AccountController : ControllerBase
{
    private readonly IAccountService _accountService;
    private readonly UserManager<ApplicationUser> _userManager;

    public AccountController(IAccountService accountService, UserManager<ApplicationUser> userManager)
    {
        _accountService = accountService;
        _userManager = userManager;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    [EnableRateLimiting("account-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        [FromServices] IValidator<RegisterRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var result = await _accountService.RegisterAsync(request, cancellationToken);
        return result.Succeeded
            ? Accepted(new { message = result.Message })
            : BadRequest(new { message = result.Message, errors = result.Errors });
    }

    [AllowAnonymous]
    [HttpPost("verify-email")]
    [EnableRateLimiting("account-token-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> VerifyEmail(
        [FromBody] VerifyEmailRequest request,
        [FromServices] IValidator<VerifyEmailRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var result = await _accountService.VerifyEmailAsync(request.UserId, request.Token);
        return result.Succeeded ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
    }

    [AllowAnonymous]
    [HttpPost("accept-invite")]
    [EnableRateLimiting("account-token-rate-limit")]
    [RequestSizeLimit(10_240)]
    public Task<IActionResult> AcceptInvite(
        [FromBody] SetPasswordRequest request,
        [FromServices] IValidator<SetPasswordRequest> validator,
        CancellationToken cancellationToken) => SetPassword(request, validator, cancellationToken);

    [AllowAnonymous]
    [HttpPost("reset-password")]
    [EnableRateLimiting("account-token-rate-limit")]
    [RequestSizeLimit(10_240)]
    public Task<IActionResult> ResetPassword(
        [FromBody] SetPasswordRequest request,
        [FromServices] IValidator<SetPasswordRequest> validator,
        CancellationToken cancellationToken) => SetPassword(request, validator, cancellationToken);

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [EnableRateLimiting("account-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] EmailRequest request,
        [FromServices] IValidator<EmailRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        await _accountService.ForgotPasswordAsync(request.Email, cancellationToken);
        return Ok(new { message = "If an account exists for this email, a reset link is on its way." });
    }

    [AllowAnonymous]
    [HttpPost("resend-verification")]
    [EnableRateLimiting("account-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> ResendVerification(
        [FromBody] EmailRequest request,
        [FromServices] IValidator<EmailRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        await _accountService.ResendVerificationAsync(request.Email, cancellationToken);
        return Ok(new { message = "If this account still needs to confirm its email, a new link is on its way." });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        [FromServices] IValidator<UpdateProfileRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        if (!TryGetUserId(out var userId)) return Unauthorized();

        var user = await _accountService.UpdateProfileAsync(userId, request.FullName);
        return user == null ? Unauthorized() : Ok(user);
    }

    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting("account-token-rate-limit")]
    [RequestSizeLimit(10_240)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        [FromServices] IValidator<ChangePasswordRequest> validator,
        CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        if (!TryGetUserId(out var userId)) return Unauthorized();
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return Unauthorized();

        var result = await _accountService.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword, HttpContext);
        return result.Succeeded
            ? Ok(new { message = result.Message })
            : BadRequest(new { message = result.Message, errors = result.Errors });
    }

    private async Task<IActionResult> SetPassword(SetPasswordRequest request, IValidator<SetPasswordRequest> validator, CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid) return BadRequest(validation.ToDictionary());

        var result = await _accountService.SetPasswordWithTokenAsync(request.UserId, request.Token, request.Password);
        return result.Succeeded
            ? Ok(new { message = result.Message })
            : BadRequest(new { message = result.Message, errors = result.Errors });
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
