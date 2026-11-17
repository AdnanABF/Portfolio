using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Infrastructure.Caching;

/// <summary>
/// Output cache policy that never reads from or writes to the shared cache for signed-in users.
/// Endpoints that return different data to admins (for example drafts) must use this, otherwise an
/// admin response could be cached and served to anonymous visitors. Anonymous responses are cached
/// as usual, and by the default policy they only ever hold public data.
/// </summary>
public sealed class PublicOnlyCachePolicy : IOutputCachePolicy
{
    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellationToken)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated == true)
        {
            context.EnableOutputCaching = false;
            context.AllowCacheLookup = false;
            context.AllowCacheStorage = false;
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellationToken)
        => ValueTask.CompletedTask;

    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellationToken)
        => ValueTask.CompletedTask;
}
