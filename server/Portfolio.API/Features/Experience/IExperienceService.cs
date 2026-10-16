namespace Portfolio.API.Features.Experience;

public interface IExperienceService
{
    Task<List<ExperienceDto>> GetAllExperiencesAsync(CancellationToken cancellationToken = default);
    Task<ExperienceDto> CreateExperienceAsync(ExperienceUpsertDto dto, CancellationToken cancellationToken = default);
    Task<ExperienceDto?> UpdateExperienceAsync(Guid id, ExperienceUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteExperienceAsync(Guid id, CancellationToken cancellationToken = default);
}
