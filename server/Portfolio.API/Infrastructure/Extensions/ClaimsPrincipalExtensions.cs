using System.Security.Claims;

namespace Portfolio.API.Infrastructure.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// True when the user is authenticated and holds the Admin or SuperAdmin role.
    /// Used to decide whether unpublished (draft) content may be returned.
    /// </summary>
    public static bool IsAdmin(this ClaimsPrincipal? user)
    {
        return user?.Identity?.IsAuthenticated == true
            && (user.IsInRole("Admin") || user.IsInRole("SuperAdmin"));
    }
}
