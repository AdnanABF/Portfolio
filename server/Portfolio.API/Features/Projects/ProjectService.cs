using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Projects;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public ProjectService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    public async Task<List<ProjectDto>> GetAllProjectsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Projects
            .AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .ThenByDescending(p => p.CreatedAt)
            .Select(p => p.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<ProjectDto?> GetProjectBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower(), cancellationToken);

        return project?.ToDto();
    }

    public async Task<ProjectDto> CreateProjectAsync(ProjectUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var project = dto.ToEntity();
        await _context.Projects.AddAsync(project, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("PROJECT_CREATE", "Project", project.Id.ToString(), $"Created project: {project.Title}");
        await _cacheStore.EvictByTagAsync("projects", cancellationToken);

        return project.ToDto();
    }

    public async Task<ProjectDto?> UpdateProjectAsync(Guid id, ProjectUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null) return null;

        project.UpdateEntity(dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("PROJECT_UPDATE", "Project", project.Id.ToString(), $"Updated project: {project.Title}");
        await _cacheStore.EvictByTagAsync("projects", cancellationToken);

        return project.ToDto();
    }

    public async Task<bool> DeleteProjectAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects.FindAsync(new object[] { id }, cancellationToken);
        if (project == null) return false;

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("PROJECT_DELETE", "Project", id.ToString(), $"Deleted project: {project.Title}");
        await _cacheStore.EvictByTagAsync("projects", cancellationToken);

        return true;
    }
}
