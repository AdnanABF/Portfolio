namespace Portfolio.API.Features.Skills;

public interface ISkillsService
{
    Task<List<SkillDto>> GetAllSkillsAsync(bool includeHidden = false, CancellationToken cancellationToken = default);
    Task<SkillDto> CreateSkillAsync(SkillUpsertDto dto, CancellationToken cancellationToken = default);
    Task<SkillDto?> UpdateSkillAsync(Guid id, SkillUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteSkillAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Sets the display order to the order of the given ids. Returns false when an id does not exist.</summary>
    Task<bool> ReorderSkillsAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default);
}
