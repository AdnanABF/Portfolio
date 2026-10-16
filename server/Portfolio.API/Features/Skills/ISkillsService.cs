namespace Portfolio.API.Features.Skills;

public interface ISkillsService
{
    Task<List<SkillDto>> GetAllSkillsAsync(CancellationToken cancellationToken = default);
    Task<SkillDto> CreateSkillAsync(SkillUpsertDto dto, CancellationToken cancellationToken = default);
    Task<SkillDto?> UpdateSkillAsync(Guid id, SkillUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteSkillAsync(Guid id, CancellationToken cancellationToken = default);
}
