namespace Portfolio.API.Features.Auth;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, HttpContext httpContext, CancellationToken cancellationToken = default);
    Task<UserDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
