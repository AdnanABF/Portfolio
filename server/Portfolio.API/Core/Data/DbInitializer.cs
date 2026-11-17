using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Core.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IConfiguration config,
        ILogger logger)
    {
        // Read admin credentials before the try block on purpose. The catch below logs and
        // swallows errors, so a missing password must throw here to stop startup.
        // Values come from environment variables, user-secrets or a secret store.
        var adminEmail = config["Admin:Email"] ?? config["SuperAdmin:Email"];
        var adminPassword = config["Admin:Password"] ?? config["SuperAdmin:Password"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "Admin:Email and Admin:Password must be configured (environment variables or user-secrets).");
        }

        try
        {
            // Ensure Database Exists & Migrations Applied
            if (context.Database.IsRelational())
            {
                await context.Database.MigrateAsync();
            }

            // 1. Roles
            foreach (var roleName in UserRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid> { Name = roleName });
                }
            }

            // 2. Initial Admin User
            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
            if (existingAdmin == null)
            {
                var admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "Adnan Bin Farook",
                    Role = UserRoles.SuperAdmin,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRolesAsync(admin, new[] { UserRoles.Admin, UserRoles.SuperAdmin });
                    logger.LogInformation("Seeded Admin user: {Email}", adminEmail);
                }
                else
                {
                    logger.LogError("Failed to seed Admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                if (!await userManager.IsInRoleAsync(existingAdmin, UserRoles.Admin))
                {
                    await userManager.AddToRoleAsync(existingAdmin, UserRoles.Admin);
                    logger.LogInformation("Added Admin role to existing admin user: {Email}", adminEmail);
                }
                if (!await userManager.IsInRoleAsync(existingAdmin, UserRoles.SuperAdmin))
                {
                    await userManager.AddToRoleAsync(existingAdmin, UserRoles.SuperAdmin);
                }

                // The configured owner account is always the SuperAdmin, active and not deleted: it cannot be
                // locked out of its own site by a mistake in the members panel.
                if (existingAdmin.Role != UserRoles.SuperAdmin || !existingAdmin.IsActive || existingAdmin.DeletedAt != null)
                {
                    existingAdmin.Role = UserRoles.SuperAdmin;
                    existingAdmin.IsActive = true;
                    existingAdmin.DeletedAt = null;
                    await userManager.UpdateAsync(existingAdmin);
                }
            }

            // Only the configured owner should hold SuperAdmin. If Admin:Email was changed, the previous owner still
            // has the role. A typo in Admin:Email would look exactly the same, and demoting the real owner because of
            // one would lock them out, so this only warns unless Admin:DemoteFormerOwners is set to true.
            var demoteFormerOwners = config.GetValue<bool>("Admin:DemoteFormerOwners");
            var owner = await userManager.FindByEmailAsync(adminEmail);
            foreach (var other in await userManager.GetUsersInRoleAsync(UserRoles.SuperAdmin))
            {
                if (owner != null && other.Id == owner.Id) continue;

                if (!demoteFormerOwners)
                {
                    logger.LogWarning(
                        "User {UserId} holds the SuperAdmin role but is not the account of Admin:Email. " +
                        "If Admin:Email was changed on purpose, set Admin:DemoteFormerOwners=true to demote them.", other.Id);
                    continue;
                }

                await userManager.RemoveFromRoleAsync(other, UserRoles.SuperAdmin);
                if (!await userManager.IsInRoleAsync(other, UserRoles.Admin))
                {
                    await userManager.AddToRoleAsync(other, UserRoles.Admin);
                }

                other.Role = UserRoles.Admin;
                await userManager.UpdateAsync(other);
                await userManager.UpdateSecurityStampAsync(other);
                logger.LogWarning("User {UserId} is no longer the SuperAdmin: it is the account of Admin:Email now.", other.Id);
            }

            // 3. Home page content (projects, experience, skills, the page text) from the owner's CV.
            // It is replaced whenever CvSeedData.Version changes, so a deploy brings the data up to date.
            await CvSeeder.ApplyAsync(context, config, logger);

            // 6. Blog Posts
            if (!await context.BlogPosts.AnyAsync())
            {
                var posts = new List<BlogPost>
                {
                    new()
                    {
                        Slug = "building-this-site",
                        Title = "How this site is built",
                        Excerpt = "Next.js App Router on a light-first theme, MDX for writing, and Docker on Coolify instead of Vercel — the full stack behind this portfolio.",
                        ContentMarkdown = "### Architecture\n\nA deep dive into the engineering decisions behind this portfolio: Next.js App Router, ASP.NET Core Web API on Linux ARM64, and PostgreSQL in Coolify.",
                        CoverImageUrl = "/og-image.png",
                        Tags = new List<string> { "Next.js", ".NET", "PostgreSQL", "Coolify" },
                        IsPublished = true,
                        PublishedAt = DateTime.SpecifyKind(DateTime.Parse("2026-10-11"), DateTimeKind.Utc)
                    },
                    new()
                    {
                        Slug = "hello-world",
                        Title = "Hello, blog",
                        Excerpt = "Why this portfolio has a blog, and what I plan to write about: .NET modernization, React, and shipping on a self-hosted stack.",
                        ContentMarkdown = "### Welcome\n\nSharing insights on enterprise .NET architecture, full-stack React, and high-performance cloud deployments.",
                        CoverImageUrl = "/og-image.png",
                        Tags = new List<string> { "Career", "Architecture" },
                        IsPublished = true,
                        PublishedAt = DateTime.SpecifyKind(DateTime.Parse("2026-10-11"), DateTimeKind.Utc)
                    }
                };

                await context.BlogPosts.AddRangeAsync(posts);
                logger.LogInformation("Seeded {Count} initial blog posts", posts.Count);
            }

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database");
        }
    }
}
