namespace Portfolio.API.Features.Experience;

public interface IExperienceService
{
    Task<List<ExperienceDto>> GetAllExperiencesAsync(bool includeHidden = false, CancellationToken cancellationToken = default);
    Task<ExperienceDto> CreateExperienceAsync(ExperienceUpsertDto dto, CancellationToken cancellationToken = default);
    Task<ExperienceDto?> UpdateExperienceAsync(Guid id, ExperienceUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteExperienceAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Sets the display order to the order of the given ids. Returns false when an id does not exist.</summary>
    Task<bool> ReorderExperiencesAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default);
}
