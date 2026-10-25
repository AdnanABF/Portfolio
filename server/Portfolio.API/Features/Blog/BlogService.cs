using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Blog;

public class BlogService : IBlogService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public BlogService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    public async Task<List<BlogPostDto>> GetAllPostsAsync(bool includeDrafts = false, CancellationToken cancellationToken = default)
    {
        var query = _context.BlogPosts.AsNoTracking();
        if (!includeDrafts)
        {
            query = query.Where(p => p.IsPublished);
        }

        return await query
            .OrderByDescending(p => p.PublishedAt ?? p.CreatedAt)
            .Select(p => p.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<BlogPostDto?> GetPostBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var post = await _context.BlogPosts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower(), cancellationToken);

        return post?.ToDto();
    }

    public async Task<BlogPostDto> CreatePostAsync(BlogPostUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var post = dto.ToEntity();
        await _context.BlogPosts.AddAsync(post, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("BLOG_CREATE", "BlogPost", post.Id.ToString(), $"Created blog post: {post.Title}");
        await _cacheStore.EvictByTagAsync("blog", cancellationToken);

        return post.ToDto();
    }

    public async Task<BlogPostDto?> UpdatePostAsync(Guid id, BlogPostUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var post = await _context.BlogPosts.FindAsync(new object[] { id }, cancellationToken);
        if (post == null) return null;

        post.UpdateEntity(dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("BLOG_UPDATE", "BlogPost", post.Id.ToString(), $"Updated blog post: {post.Title}");
        await _cacheStore.EvictByTagAsync("blog", cancellationToken);

        return post.ToDto();
    }

    public async Task<bool> DeletePostAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var post = await _context.BlogPosts.FindAsync(new object[] { id }, cancellationToken);
        if (post == null) return false;

        _context.BlogPosts.Remove(post);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("BLOG_DELETE", "BlogPost", id.ToString(), $"Deleted blog post: {post.Title}");
        await _cacheStore.EvictByTagAsync("blog", cancellationToken);

        return true;
    }
}
