using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Projects;

public static class ProjectMappingExtensions
{
    public static ProjectDto ToDto(this Project project)
    {
        return new ProjectDto
        {
            Id = project.Id,
            Slug = project.Slug,
            Title = project.Title,
            Tagline = project.Tagline,
            Description = project.Description,
            HeroImageUrl = project.HeroImageUrl,
            Tags = project.Tags,
            Screenshots = project.Screenshots,
            LiveUrl = project.LiveUrl,
            GithubUrl = project.GithubUrl,
            IsFeatured = project.IsFeatured,
            IsPublished = project.IsPublished,
            SortOrder = project.SortOrder,
            KeyMetricsJson = project.KeyMetricsJson,
            ContentMarkdown = project.ContentMarkdown,
            UpdatedAt = project.UpdatedAt
        };
    }

    public static Project ToEntity(this ProjectUpsertDto dto)
    {
        return new Project
        {
            Slug = dto.Slug.ToLowerInvariant(),
            Title = dto.Title,
            Tagline = dto.Tagline,
            Description = dto.Description,
            HeroImageUrl = dto.HeroImageUrl,
            Tags = dto.Tags,
            Screenshots = dto.Screenshots,
            LiveUrl = dto.LiveUrl,
            GithubUrl = dto.GithubUrl,
            IsFeatured = dto.IsFeatured,
            IsPublished = dto.IsPublished,
            SortOrder = dto.SortOrder,
            KeyMetricsJson = dto.KeyMetricsJson,
            ContentMarkdown = dto.ContentMarkdown,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntity(this Project project, ProjectUpsertDto dto)
    {
        project.Slug = dto.Slug.ToLowerInvariant();
        project.Title = dto.Title;
        project.Tagline = dto.Tagline;
        project.Description = dto.Description;
        project.HeroImageUrl = dto.HeroImageUrl;
        project.Tags = dto.Tags;
        project.Screenshots = dto.Screenshots;
        project.LiveUrl = dto.LiveUrl;
        project.GithubUrl = dto.GithubUrl;
        project.IsFeatured = dto.IsFeatured;
        project.IsPublished = dto.IsPublished;
        project.SortOrder = dto.SortOrder;
        project.KeyMetricsJson = dto.KeyMetricsJson;
        project.ContentMarkdown = dto.ContentMarkdown;
        project.UpdatedAt = DateTime.UtcNow;
    }
}
