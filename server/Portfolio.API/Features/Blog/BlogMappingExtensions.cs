using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Blog;

public static class BlogMappingExtensions
{
    public static BlogPostDto ToDto(this BlogPost post)
    {
        return new BlogPostDto
        {
            Id = post.Id,
            Slug = post.Slug,
            Title = post.Title,
            Excerpt = post.Excerpt,
            ContentMarkdown = post.ContentMarkdown,
            CoverImageUrl = post.CoverImageUrl,
            Tags = post.Tags,
            IsPublished = post.IsPublished,
            PublishedAt = post.PublishedAt,
            UpdatedAt = post.UpdatedAt
        };
    }

    public static BlogPost ToEntity(this BlogPostUpsertDto dto)
    {
        return new BlogPost
        {
            Slug = dto.Slug.ToLowerInvariant(),
            Title = dto.Title,
            Excerpt = dto.Excerpt,
            ContentMarkdown = dto.ContentMarkdown,
            CoverImageUrl = dto.CoverImageUrl,
            Tags = dto.Tags,
            IsPublished = dto.IsPublished,
            PublishedAt = dto.PublishedAt ?? (dto.IsPublished ? DateTime.UtcNow : null),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntity(this BlogPost post, BlogPostUpsertDto dto)
    {
        post.Slug = dto.Slug.ToLowerInvariant();
        post.Title = dto.Title;
        post.Excerpt = dto.Excerpt;
        post.ContentMarkdown = dto.ContentMarkdown;
        post.CoverImageUrl = dto.CoverImageUrl;
        post.Tags = dto.Tags;
        post.IsPublished = dto.IsPublished;
        if (dto.IsPublished && post.PublishedAt == null)
        {
            post.PublishedAt = dto.PublishedAt ?? DateTime.UtcNow;
        }
        else if (dto.PublishedAt != null)
        {
            post.PublishedAt = dto.PublishedAt;
        }
        post.UpdatedAt = DateTime.UtcNow;
    }
}
