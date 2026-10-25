namespace Portfolio.API.Features.Blog;

public interface IBlogService
{
    Task<List<BlogPostDto>> GetAllPostsAsync(bool includeDrafts = false, CancellationToken cancellationToken = default);
    Task<BlogPostDto?> GetPostBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<BlogPostDto> CreatePostAsync(BlogPostUpsertDto dto, CancellationToken cancellationToken = default);
    Task<BlogPostDto?> UpdatePostAsync(Guid id, BlogPostUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeletePostAsync(Guid id, CancellationToken cancellationToken = default);
}
