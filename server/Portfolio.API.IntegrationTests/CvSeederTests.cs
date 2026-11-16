using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Homepage;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// The home page content the API fills in from the owner's CV: what a new database gets, that a newer CV version
/// replaces older content on the next start, and that edits survive restarts while the version is unchanged.
/// Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class CvSeederTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CvSeederTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task RunSeederAsync(AppDbContext db, bool force = false)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Content:ReplaceWithCvSeed"] = force ? "true" : "false" })
            .Build();
        await CvSeeder.ApplyAsync(db, config, NullLogger.Instance);
    }

    [Fact]
    public async Task The_Database_Holds_The_Whole_CV_With_The_Skills_Grouped_As_In_The_CV()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Forced, so rows left behind by other test classes do not matter.
        await RunSeederAsync(db, force: true);

        var skills = await db.Skills.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync();
        var categories = skills.Select(s => s.Category).Distinct().ToList();
        Assert.Equal(
            ["Languages", ".NET & Backend", "Frontend", "Identity & Security", "Cloud & DevOps", "Databases & Caching", "Testing & Quality", "Tools", "AI-Assisted Development"],
            categories);
        Assert.Contains(skills, s => s.Category == "Identity & Security" && s.Name == "SAML");
        Assert.Contains(skills, s => s.Category == "Cloud & DevOps" && s.Name == "GitHub Actions");
        Assert.All(skills, s => Assert.True(s.IsVisible));

        var experience = await db.Experiences.AsNoTracking().OrderBy(e => e.SortOrder).ToListAsync();
        Assert.Equal(3, experience.Count);
        Assert.Contains("Frappe", experience[0].Achievements[0]);
        Assert.Equal("Skien Software Lab", experience[2].Company);

        var slugs = await db.Projects.AsNoTracking().OrderBy(p => p.SortOrder).Select(p => p.Slug).ToListAsync();
        Assert.Equal(["viralippurath-family", "gramahub", "vacabook"], slugs);

        // Only the project with a real screenshot has an image; the others get a designed cover on the site.
        var withImages = await db.Projects.AsNoTracking().Where(p => p.HeroImageUrl != "").Select(p => p.Slug).ToListAsync();
        Assert.Equal(["viralippurath-family"], withImages);

        var published = SiteContentService.Parse((await db.SiteContents.AsNoTracking().SingleAsync(c => c.Key == SiteContentKeys.Published)).Json);
        Assert.Equal("Jahra, Kuwait", published.Location.Address);
        Assert.DoesNotContain(published.About.Cards, c => c.Title is "Education" or "Certifications" or "Languages");
        Assert.Contains(published.Sections, x => x.Id == "education");
        Assert.Contains(published.Sections, x => x.Id == "certifications");

        var education = await db.Educations.AsNoTracking().ToListAsync();
        Assert.Contains(education, e => e.Qualification.StartsWith("Bachelor of Technology") && e.Period == "2018 - 2022");

        var certifications = await db.Certifications.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync();
        Assert.Equal(["IBM", "TestDome", "Virtual Cyber Labs"], certifications.Select(c => c.Issuer));
        Assert.Equal("January 2026", certifications[0].IssuedOn);

        Assert.Equal(CvSeedData.Version, (await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Key == CvSeeder.VersionKey)).Value);
    }

    [Fact]
    public async Task A_Newer_CV_Version_Replaces_Old_Content_But_Keeps_The_Uploaded_Files_And_Linked_Projects()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await RunSeederAsync(db);

        // An owner who had old content, an uploaded photo and CV, and a project that someone asked for access to.
        db.Skills.Add(new Skill { Category = "Modern", Name = "Old skill" });
        db.Experiences.Add(new Experience { Role = "Old role", Company = "Old Co" });
        db.Projects.Add(new Project { Slug = "old-project", Title = "Old project" });
        db.Educations.Add(new Education { Institution = "Old school", Qualification = "Old course" });
        db.Certifications.Add(new Certification { Title = "Old certificate" });
        var kept = await db.Projects.SingleAsync(p => p.Slug == "gramahub");
        kept.Title = "Stale title";
        var published = await db.SiteContents.SingleAsync(c => c.Key == SiteContentKeys.Published);
        var content = SiteContentService.Parse(published.Json);
        content.Profile.PhotoUrl = "/media/uploaded-photo.webp";
        content.Profile.CvUrl = "/media/uploaded-cv.pdf";
        content.Profile.Name = "Old name";
        published.Json = SiteContentService.Serialize(content);
        (await db.SiteSettings.SingleAsync(s => s.Key == CvSeeder.VersionKey)).Value = "an-older-cv";
        db.SiteSettings.RemoveRange(await db.SiteSettings.Where(s => s.Key == "bio").ToListAsync());
        db.SiteSettings.Add(new SiteSetting { Key = "bio", Value = "Old bio with the wrong city" });
        await db.SaveChangesAsync();
        var keptId = kept.Id;

        await RunSeederAsync(db);

        Assert.DoesNotContain(await db.Skills.AsNoTracking().ToListAsync(), s => s.Name == "Old skill");
        Assert.DoesNotContain(await db.Experiences.AsNoTracking().ToListAsync(), e => e.Company == "Old Co");
        // A project the owner added is kept on a newer version (only a first seed or a forced replace removes others).
        Assert.Contains(await db.Projects.AsNoTracking().ToListAsync(), p => p.Slug == "old-project");
        Assert.DoesNotContain(await db.Educations.AsNoTracking().ToListAsync(), e => e.Institution == "Old school");
        Assert.DoesNotContain(await db.Certifications.AsNoTracking().ToListAsync(), c => c.Title == "Old certificate");
        // Settings other than the old editor's and the version marker are left alone.
        Assert.Contains(await db.SiteSettings.AsNoTracking().ToListAsync(), s => s.Key == "bio");

        var project = await db.Projects.AsNoTracking().SingleAsync(p => p.Slug == "gramahub");
        Assert.Equal(keptId, project.Id);
        Assert.Equal("GramaHub", project.Title);

        var after = SiteContentService.Parse((await db.SiteContents.AsNoTracking().SingleAsync(c => c.Key == SiteContentKeys.Published)).Json);
        Assert.Equal("Adnan Bin Farook", after.Profile.Name);
        Assert.Equal("/media/uploaded-photo.webp", after.Profile.PhotoUrl);
        Assert.Equal("/media/uploaded-cv.pdf", after.Profile.CvUrl);

        // The draft starts out identical to the published content.
        var draft = (await db.SiteContents.AsNoTracking().SingleAsync(c => c.Key == SiteContentKeys.Draft)).Json;
        Assert.Equal(SiteContentService.Serialize(after), SiteContentService.Serialize(SiteContentService.Parse(draft)));
        Assert.Equal(CvSeedData.Version, (await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Key == CvSeeder.VersionKey)).Value);
    }

    [Fact]
    public async Task Edits_Survive_A_Restart_While_The_CV_Version_Is_Unchanged()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await RunSeederAsync(db);

        var extra = new Skill { Category = "Spoken Languages", Name = $"Added-{Guid.NewGuid():N}", SortOrder = 999 };
        db.Skills.Add(extra);
        await db.SaveChangesAsync();
        try
        {
            await RunSeederAsync(db);
            Assert.Contains(await db.Skills.AsNoTracking().ToListAsync(), s => s.Id == extra.Id);

            // The switch forces a replacement on that start.
            await RunSeederAsync(db, force: true);
            Assert.DoesNotContain(await db.Skills.AsNoTracking().ToListAsync(), s => s.Id == extra.Id);
        }
        finally
        {
            db.Skills.RemoveRange(db.Skills.Where(s => s.Id == extra.Id));
            await db.SaveChangesAsync();
        }
    }
}
