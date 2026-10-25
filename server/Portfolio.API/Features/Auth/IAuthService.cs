using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Auth;

public interface IAuthService
{
    Task CompleteLoginAsync(ApplicationUser user, string loginMethod, HttpContext httpContext, CancellationToken cancellationToken = default);
    Task<LoginResponse?> LoginAsync(LoginRequest request, HttpContext httpContext, CancellationToken cancellationToken = default);
    Task LogoutAsync(HttpContext httpContext);
    Task SignOutEverywhereAsync(ApplicationUser user, HttpContext httpContext);
    Task<UserDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
