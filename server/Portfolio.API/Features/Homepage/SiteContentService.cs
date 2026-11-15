using System.Text.Json;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Homepage;

/// <summary>What the admin hub loads: the draft being edited and where it stands against the published page.</summary>
public class SiteContentAdminDto
{
    public HomepageContent Draft { get; set; } = new();
    public bool HasUnpublishedChanges { get; set; }
    public DateTime DraftUpdatedAt { get; set; }
    public string? DraftUpdatedBy { get; set; }
    public DateTime PublishedAt { get; set; }
}

public interface ISiteContentService
{
    /// <summary>The content visitors see.</summary>
    Task<HomepageContent> GetPublishedAsync(CancellationToken cancellationToken = default);

    Task<SiteContentAdminDto> GetAdminAsync(CancellationToken cancellationToken = default);
    Task<SiteContentAdminDto> SaveDraftAsync(HomepageContent content, string? actor, CancellationToken cancellationToken = default);
    Task<SiteContentAdminDto> PublishAsync(string? actor, CancellationToken cancellationToken = default);
    Task<SiteContentAdminDto> DiscardDraftAsync(string? actor, CancellationToken cancellationToken = default);
}

public class SiteContentService : ISiteContentService
{
    public const string CacheTag = "site-content";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public SiteContentService(AppDbContext context, IActivityLogger activityLogger, IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    /// <summary>Turns the stored text into content. Stored JSON that no longer parses falls back to the starting content.</summary>
    public static HomepageContent Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return HomepageContentDefaults.Create();
        try
        {
            var content = JsonSerializer.Deserialize<HomepageContent>(json, JsonOptions) ?? HomepageContentDefaults.Create();
            AddMissingSections(content);
            return content;
        }
        catch (JsonException)
        {
            return HomepageContentDefaults.Create();
        }
    }

    /// <summary>
    /// A document saved before a section existed does not list it. Add it (with its starting heading) at the place
    /// it has in the starting content, so the section can be shown, moved or switched off like the others.
    /// </summary>
    private static void AddMissingSections(HomepageContent content)
    {
        var starting = HomepageContentDefaults.Create().Sections;
        for (var i = 0; i < starting.Count; i++)
        {
            if (content.Sections.Any(s => s.Id == starting[i].Id)) continue;
            content.Sections.Insert(Math.Min(i, content.Sections.Count), starting[i]);
        }
    }

    public static string Serialize(HomepageContent content) => JsonSerializer.Serialize(content, JsonOptions);

    public async Task<HomepageContent> GetPublishedAsync(CancellationToken cancellationToken = default)
    {
        var row = await _context.SiteContents.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Key == SiteContentKeys.Published, cancellationToken);
        return Parse(row?.Json);
    }

    public async Task<SiteContentAdminDto> GetAdminAsync(CancellationToken cancellationToken = default)
    {
        var (draft, published) = await LoadRowsAsync(cancellationToken);
        return ToDto(draft, published);
    }

    public async Task<SiteContentAdminDto> SaveDraftAsync(HomepageContent content, string? actor, CancellationToken cancellationToken = default)
    {
        var (draft, published) = await LoadRowsAsync(cancellationToken);
        draft.Json = Serialize(content);
        draft.UpdatedAt = DateTime.UtcNow;
        draft.UpdatedBy = actor;
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("SITE_CONTENT_DRAFT_SAVE", "SiteContent", SiteContentKeys.Draft, "Saved the home page draft.");
        return ToDto(draft, published);
    }

    public async Task<SiteContentAdminDto> PublishAsync(string? actor, CancellationToken cancellationToken = default)
    {
        var (draft, published) = await LoadRowsAsync(cancellationToken);
        published.Json = draft.Json;
        published.UpdatedAt = DateTime.UtcNow;
        published.UpdatedBy = actor;
        await _context.SaveChangesAsync(cancellationToken);

        await _cacheStore.EvictByTagAsync(CacheTag, cancellationToken);
        await _activityLogger.LogAsync("SITE_CONTENT_PUBLISH", "SiteContent", SiteContentKeys.Published, "Published the home page.");
        return ToDto(draft, published);
    }

    public async Task<SiteContentAdminDto> DiscardDraftAsync(string? actor, CancellationToken cancellationToken = default)
    {
        var (draft, published) = await LoadRowsAsync(cancellationToken);
        draft.Json = published.Json;
        draft.UpdatedAt = DateTime.UtcNow;
        draft.UpdatedBy = actor;
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync("SITE_CONTENT_DRAFT_DISCARD", "SiteContent", SiteContentKeys.Draft, "Discarded the home page draft.");
        return ToDto(draft, published);
    }

    /// <summary>Both rows, created from the starting content when a database has not been seeded yet.</summary>
    private async Task<(SiteContent Draft, SiteContent Published)> LoadRowsAsync(CancellationToken cancellationToken)
    {
        var rows = await _context.SiteContents.ToListAsync(cancellationToken);
        var published = rows.FirstOrDefault(r => r.Key == SiteContentKeys.Published);
        var draft = rows.FirstOrDefault(r => r.Key == SiteContentKeys.Draft);

        if (published == null || draft == null)
        {
            var json = published?.Json ?? draft?.Json ?? Serialize(HomepageContentDefaults.Create());
            published ??= _context.SiteContents.Add(new SiteContent { Key = SiteContentKeys.Published, Json = json }).Entity;
            draft ??= _context.SiteContents.Add(new SiteContent { Key = SiteContentKeys.Draft, Json = json }).Entity;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return (draft, published);
    }

    private static SiteContentAdminDto ToDto(SiteContent draft, SiteContent published)
    {
        // Compare the parsed-and-reserialized text, so formatting or field order never counts as a change.
        var draftContent = Parse(draft.Json);
        return new SiteContentAdminDto
        {
            Draft = draftContent,
            HasUnpublishedChanges = Serialize(draftContent) != Serialize(Parse(published.Json)),
            DraftUpdatedAt = draft.UpdatedAt,
            DraftUpdatedBy = draft.UpdatedBy,
            PublishedAt = published.UpdatedAt
        };
    }
}
