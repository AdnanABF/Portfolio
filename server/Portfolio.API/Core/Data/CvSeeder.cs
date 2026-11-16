using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Homepage;

namespace Portfolio.API.Core.Data;

/// <summary>
/// Fills the home page content (projects, experience, skills and the page text) from the owner's CV.
///
/// Every start compares <see cref="CvSeedData.Version"/> with the version stored in the database. When they differ
/// (a new database, or a deploy that brought a newer CV) the old home page content is thrown away and replaced with
/// the CV data, all in one transaction. When they match, nothing is replaced, so edits made in the admin hub stay
/// until the next CV version. <c>Content:ReplaceWithCvSeed=true</c> forces a replacement on that start.
///
/// Replaced: experience, education, certifications, skills, the CV projects, the home page text (draft and published) and the old editor's setting.
/// Kept: blog posts, messages, members, and the photo and CV file the owner uploaded. Projects are matched by their
/// page address, so a repo access request that points at a project stays linked to it.
/// </summary>
public static class CvSeeder
{
    public const string VersionKey = "content_seed_version";

    public static async Task ApplyAsync(AppDbContext context, IConfiguration config, ILogger logger)
    {
        var stored = (await context.SiteSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == VersionKey))?.Value;
        var forced = config.GetValue<bool>("Content:ReplaceWithCvSeed");
        var replace = forced || stored != CvSeedData.Version;
        // Projects the owner added are only removed on a first CV seed or when forced; a later version keeps them.
        var removeOtherProjects = forced || stored == null;

        await using var transaction = context.Database.IsRelational() ? await context.Database.BeginTransactionAsync() : null;

        var (photoUrl, cvUrl) = await ExistingMediaAsync(context);

        if (replace)
        {
            context.Experiences.RemoveRange(await context.Experiences.ToListAsync());
            context.Skills.RemoveRange(await context.Skills.ToListAsync());
            context.Educations.RemoveRange(await context.Educations.ToListAsync());
            context.Certifications.RemoveRange(await context.Certifications.ToListAsync());
            context.SiteContents.RemoveRange(await context.SiteContents.ToListAsync());
            // Only the old editor's settings and the version marker go; any other setting is kept.
            context.SiteSettings.RemoveRange(await context.SiteSettings.Where(s => s.Key == "hero_photo_cv" || s.Key == VersionKey).ToListAsync());
            await UpsertProjectsAsync(context, removeOtherProjects);
            await context.SaveChangesAsync();
        }

        if (!await context.Projects.AnyAsync()) await UpsertProjectsAsync(context, false);
        if (!await context.Experiences.AnyAsync()) await context.Experiences.AddRangeAsync(CvSeedData.Experiences());
        if (!await context.Skills.AnyAsync()) await context.Skills.AddRangeAsync(CvSeedData.Skills());
        if (!await context.Educations.AnyAsync()) await context.Educations.AddRangeAsync(CvSeedData.Educations());
        if (!await context.Certifications.AnyAsync()) await context.Certifications.AddRangeAsync(CvSeedData.Certifications());

        if (!await context.SiteContents.AnyAsync())
        {
            var json = SiteContentService.Serialize(HomepageContentDefaults.Create(photoUrl, cvUrl));
            await context.SiteContents.AddRangeAsync(
                new SiteContent { Key = SiteContentKeys.Published, Json = json },
                new SiteContent { Key = SiteContentKeys.Draft, Json = json });
        }

        if (!await context.SiteSettings.AnyAsync(s => s.Key == VersionKey))
        {
            await context.SiteSettings.AddAsync(new SiteSetting { Key = VersionKey, Value = CvSeedData.Version });
        }

        await context.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();

        if (replace)
        {
            logger.LogWarning(
                "Home page content was replaced with the CV data (version {Version}, was {Previous}).",
                CvSeedData.Version, stored ?? "none");
        }
    }

    /// <summary>The photo and CV file the owner already uploaded, so a replacement does not lose them.</summary>
    private static async Task<(string? PhotoUrl, string? CvUrl)> ExistingMediaAsync(AppDbContext context)
    {
        var published = await context.SiteContents.AsNoTracking().FirstOrDefaultAsync(c => c.Key == SiteContentKeys.Published);
        if (published != null)
        {
            var profile = SiteContentService.Parse(published.Json).Profile;
            return (Clean(profile.PhotoUrl), Clean(profile.CvUrl));
        }

        // The earlier editor kept them in one setting.
        var legacy = await context.SiteSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "hero_photo_cv");
        if (!string.IsNullOrWhiteSpace(legacy?.Value))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(legacy.Value);
                var photo = doc.RootElement.TryGetProperty("photoUrl", out var p) ? p.GetString() : null;
                var cv = doc.RootElement.TryGetProperty("cvUrl", out var c) ? c.GetString() : null;
                return (Clean(photo), Clean(cv));
            }
            catch (System.Text.Json.JsonException)
            {
                // An unreadable old value is ignored.
            }
        }

        return (null, null);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    /// <summary>Projects from the CV: existing ones with the same page address are updated, others removed only when asked, new ones added.</summary>
    private static async Task UpsertProjectsAsync(AppDbContext context, bool removeOthers)
    {
        var wanted = CvSeedData.Projects();
        var existing = await context.Projects.ToListAsync();

        if (removeOthers)
        {
            foreach (var project in existing.Where(e => wanted.All(w => w.Slug != e.Slug)))
            {
                context.Projects.Remove(project);
            }
        }

        foreach (var seed in wanted)
        {
            var current = existing.FirstOrDefault(e => e.Slug == seed.Slug);
            if (current == null)
            {
                await context.Projects.AddAsync(seed);
                continue;
            }

            current.Title = seed.Title;
            current.Tagline = seed.Tagline;
            current.Description = seed.Description;
            current.HeroImageUrl = seed.HeroImageUrl;
            current.Tags = seed.Tags;
            current.Screenshots = seed.Screenshots;
            current.LiveUrl = seed.LiveUrl;
            current.GithubUrl = seed.GithubUrl;
            current.IsFeatured = seed.IsFeatured;
            current.IsPublished = seed.IsPublished;
            current.IsRepoPrivate = seed.IsRepoPrivate;
            current.SortOrder = seed.SortOrder;
            current.KeyMetricsJson = seed.KeyMetricsJson;
            current.ContentMarkdown = seed.ContentMarkdown;
            current.UpdatedAt = DateTime.UtcNow;
        }
    }
}
