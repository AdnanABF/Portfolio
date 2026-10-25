namespace Portfolio.API.Features.Projects;

public interface IProjectService
{
    Task<List<ProjectDto>> GetAllProjectsAsync(bool includeDrafts = false, CancellationToken cancellationToken = default);
    Task<ProjectDto?> GetProjectBySlugAsync(string slug, bool includeDrafts = false, CancellationToken cancellationToken = default);
    Task<ProjectDto> CreateProjectAsync(ProjectUpsertDto dto, CancellationToken cancellationToken = default);
    Task<ProjectDto?> UpdateProjectAsync(Guid id, ProjectUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteProjectAsync(Guid id, CancellationToken cancellationToken = default);
}
