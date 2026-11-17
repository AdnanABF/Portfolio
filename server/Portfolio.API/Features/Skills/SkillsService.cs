using Portfolio.API.Features.Homepage;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Skills;

public class SkillsService : ISkillsService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public SkillsService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    public async Task<List<SkillDto>> GetAllSkillsAsync(bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        return await _context.Skills
            .AsNoTracking()
            .Where(s => includeHidden || s.IsVisible)
            .OrderBy(s => s.SortOrder)
            .Select(s => s.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<SkillDto> CreateSkillAsync(SkillUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var skill = dto.ToEntity();
        await _context.Skills.AddAsync(skill, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("SKILL_CREATE", "Skill", skill.Id.ToString(), $"Created skill: {skill.Name} ({skill.Category})");
        await _cacheStore.EvictByTagAsync("skills", cancellationToken);

        return skill.ToDto();
    }

    public async Task<SkillDto?> UpdateSkillAsync(Guid id, SkillUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var skill = await _context.Skills.FindAsync(new object[] { id }, cancellationToken);
        if (skill == null) return null;

        skill.UpdateEntity(dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("SKILL_UPDATE", "Skill", skill.Id.ToString(), $"Updated skill: {skill.Name} ({skill.Category})");
        await _cacheStore.EvictByTagAsync("skills", cancellationToken);

        return skill.ToDto();
    }

    public async Task<bool> DeleteSkillAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var skill = await _context.Skills.FindAsync(new object[] { id }, cancellationToken);
        if (skill == null) return false;

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("SKILL_DELETE", "Skill", id.ToString(), $"Deleted skill: {skill.Name}");
        await _cacheStore.EvictByTagAsync("skills", cancellationToken);

        return true;
    }

    public async Task<bool> ReorderSkillsAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var skills = await _context.Skills.ToListAsync(cancellationToken);
        if (!ReorderHelper.Apply(skills, orderedIds, s => s.Id, s => s.SortOrder, (s, n) => s.SortOrder = n)) return false;

        await _context.SaveChangesAsync(cancellationToken);
        await _activityLogger.LogAsync("SKILL_REORDER", "Skill", "-", "Changed the skills order.");
        await _cacheStore.EvictByTagAsync("skills", cancellationToken);
        return true;
    }
}
