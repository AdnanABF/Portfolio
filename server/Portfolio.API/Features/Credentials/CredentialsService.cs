using Portfolio.API.Features.Homepage;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Credentials;

public interface ICredentialsService
{
    Task<List<EducationDto>> GetEducationAsync(bool includeHidden, CancellationToken cancellationToken = default);
    Task<EducationDto> CreateEducationAsync(EducationUpsertDto dto, CancellationToken cancellationToken = default);
    Task<EducationDto?> UpdateEducationAsync(Guid id, EducationUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteEducationAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ReorderEducationAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default);

    Task<List<CertificationDto>> GetCertificationsAsync(bool includeHidden, CancellationToken cancellationToken = default);
    Task<CertificationDto> CreateCertificationAsync(CertificationUpsertDto dto, CancellationToken cancellationToken = default);
    Task<CertificationDto?> UpdateCertificationAsync(Guid id, CertificationUpsertDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteCertificationAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ReorderCertificationsAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default);
}

/// <summary>Education entries and certifications: the two lists shown in their own home page sections.</summary>
public class CredentialsService : ICredentialsService
{
    public const string EducationTag = "education";
    public const string CertificationsTag = "certifications";

    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public CredentialsService(AppDbContext context, IActivityLogger activityLogger, IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    // ---- education -------------------------------------------------------------------------------

    private static EducationDto ToDto(Education e) => new()
    {
        Id = e.Id, Institution = e.Institution, Qualification = e.Qualification, Location = e.Location,
        Period = e.Period, Details = e.Details, SortOrder = e.SortOrder, IsVisible = e.IsVisible
    };

    private static void Apply(Education e, EducationUpsertDto dto)
    {
        e.Institution = dto.Institution.Trim();
        e.Qualification = dto.Qualification.Trim();
        e.Location = dto.Location.Trim();
        e.Period = dto.Period.Trim();
        e.Details = dto.Details.Select(d => d.Trim()).Where(d => d.Length > 0).ToList();
        e.SortOrder = dto.SortOrder;
        e.IsVisible = dto.IsVisible;
    }

    public async Task<List<EducationDto>> GetEducationAsync(bool includeHidden, CancellationToken cancellationToken = default) =>
        await _context.Educations.AsNoTracking()
            .Where(e => includeHidden || e.IsVisible)
            .OrderBy(e => e.SortOrder)
            .Select(e => ToDto(e))
            .ToListAsync(cancellationToken);

    public async Task<EducationDto> CreateEducationAsync(EducationUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var entity = new Education();
        Apply(entity, dto);
        await _context.Educations.AddAsync(entity, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EDUCATION_CREATE", "Education", entity.Id.ToString(), $"Created education: {entity.Qualification} at {entity.Institution}");
        await _cacheStore.EvictByTagAsync(EducationTag, cancellationToken);
        return ToDto(entity);
    }

    public async Task<EducationDto?> UpdateEducationAsync(Guid id, EducationUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Educations.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null) return null;

        Apply(entity, dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EDUCATION_UPDATE", "Education", entity.Id.ToString(), $"Updated education: {entity.Qualification} at {entity.Institution}");
        await _cacheStore.EvictByTagAsync(EducationTag, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteEducationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Educations.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null) return false;

        _context.Educations.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("EDUCATION_DELETE", "Education", id.ToString(), $"Deleted education: {entity.Qualification}");
        await _cacheStore.EvictByTagAsync(EducationTag, cancellationToken);
        return true;
    }

    public async Task<bool> ReorderEducationAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var items = await _context.Educations.ToListAsync(cancellationToken);
        if (!ReorderHelper.Apply(items, orderedIds, e => e.Id, e => e.SortOrder, (e, n) => e.SortOrder = n)) return false;await _context.SaveChangesAsync(cancellationToken);
        await _activityLogger.LogAsync("EDUCATION_REORDER", "Education", "-", "Changed the education order.");
        await _cacheStore.EvictByTagAsync(EducationTag, cancellationToken);
        return true;
    }

    // ---- certifications ---------------------------------------------------------------------------

    private static CertificationDto ToDto(Certification c) => new()
    {
        Id = c.Id, Title = c.Title, Issuer = c.Issuer, IssuedOn = c.IssuedOn, CredentialUrl = c.CredentialUrl,
        SortOrder = c.SortOrder, IsVisible = c.IsVisible
    };

    private static void Apply(Certification c, CertificationUpsertDto dto)
    {
        c.Title = dto.Title.Trim();
        c.Issuer = dto.Issuer.Trim();
        c.IssuedOn = dto.IssuedOn.Trim();
        c.CredentialUrl = dto.CredentialUrl.Trim();
        c.SortOrder = dto.SortOrder;
        c.IsVisible = dto.IsVisible;
    }

    public async Task<List<CertificationDto>> GetCertificationsAsync(bool includeHidden, CancellationToken cancellationToken = default) =>
        await _context.Certifications.AsNoTracking()
            .Where(c => includeHidden || c.IsVisible)
            .OrderBy(c => c.SortOrder)
            .Select(c => ToDto(c))
            .ToListAsync(cancellationToken);

    public async Task<CertificationDto> CreateCertificationAsync(CertificationUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var entity = new Certification();
        Apply(entity, dto);
        await _context.Certifications.AddAsync(entity, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("CERTIFICATION_CREATE", "Certification", entity.Id.ToString(), $"Created certification: {entity.Title}");
        await _cacheStore.EvictByTagAsync(CertificationsTag, cancellationToken);
        return ToDto(entity);
    }

    public async Task<CertificationDto?> UpdateCertificationAsync(Guid id, CertificationUpsertDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Certifications.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null) return null;

        Apply(entity, dto);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("CERTIFICATION_UPDATE", "Certification", entity.Id.ToString(), $"Updated certification: {entity.Title}");
        await _cacheStore.EvictByTagAsync(CertificationsTag, cancellationToken);
        return ToDto(entity);
    }

    public async Task<bool> DeleteCertificationAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Certifications.FindAsync(new object[] { id }, cancellationToken);
        if (entity == null) return false;

        _context.Certifications.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("CERTIFICATION_DELETE", "Certification", id.ToString(), $"Deleted certification: {entity.Title}");
        await _cacheStore.EvictByTagAsync(CertificationsTag, cancellationToken);
        return true;
    }

    public async Task<bool> ReorderCertificationsAsync(IReadOnlyList<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var items = await _context.Certifications.ToListAsync(cancellationToken);
        if (!ReorderHelper.Apply(items, orderedIds, c => c.Id, c => c.SortOrder, (c, n) => c.SortOrder = n)) return false;await _context.SaveChangesAsync(cancellationToken);
        await _activityLogger.LogAsync("CERTIFICATION_REORDER", "Certification", "-", "Changed the certifications order.");
        await _cacheStore.EvictByTagAsync(CertificationsTag, cancellationToken);
        return true;
    }
}
