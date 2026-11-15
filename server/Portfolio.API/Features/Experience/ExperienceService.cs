using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Experience;

public class ExperienceService : IExperienceService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public ExperienceService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    public async Task<List<ExperienceDto>> GetAllExperiencesAsync(bool includeHidden = false, CancellationToken cancellationToken = default)
    {
        return await _context.Experiences
            .AsNoTracking()
            .Where(e => includeHidden || e.IsVisible)
            .OrderBy(e => e.SortOrder)
            .Select(e => e.ToDto())
            .ToListAsync(cancellationToken);
    }

    public async Task<ExperienceDto> CreateExperienceAsync(ExperienceUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var experience = dto.ToEntity();
        await _context.Experiences.AddAsync(experience, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EXPERIENCE_CREATE", "Experience", experience.Id.ToString(), $"Created experience: {experience.Role} at {experience.Company}");
        await _cacheStore.EvictByTagAsync("experience", cancellationToken);

        return experience.ToDto();
    }

    public async Task<ExperienceDto?> UpdateExperienceAsync(Guid id, ExperienceUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var experience = await _context.Experiences.FindAsync(new object[] { id }, cancellationToken);
        if (experience == null) return null;

        experience.UpdateEntity(dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EXPERIENCE_UPDATE", "Experience", experience.Id.ToString(), $"Updated experience: {experience.Role} at {experience.Company}");
        await _cacheStore.EvictByTagAsync("experience", cancellationToken);

        return experience.ToDto();
    }

    public async Task<bool> DeleteExperienceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var experience = await _context.Experiences.FindAsync(new object[] { id }, cancellationToken);
        if (experience == null) return false;

        _context.Experiences.Remove(experience);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EXPERIENCE_DELETE", "Experience", id.ToString(), $"Deleted experience: {experience.Role} at {experience.Company}");
        await _cacheStore.EvictByTagAsync("experience", cancellationToken);

        return true;
    }

    public async Task<bool> ReorderExperiencesAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var items = await _context.Experiences.Where(e => orderedIds.Contains(e.Id)).ToListAsync(cancellationToken);
        if (items.Count != orderedIds.Distinct().Count()) return false;

        for (var i = 0; i < orderedIds.Count; i++)
        {
            items.First(e => e.Id == orderedIds[i]).SortOrder = i;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _activityLogger.LogAsync("EXPERIENCE_REORDER", "Experience", "-", "Changed the experience order.");
        await _cacheStore.EvictByTagAsync("experience", cancellationToken);
        return true;
    }
}
