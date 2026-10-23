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
        try
        {
            // Ensure Database Exists & Migrations Applied
            if (context.Database.IsRelational())
            {
                await context.Database.MigrateAsync();
            }

            // 1. Roles
            string[] roles = { "SuperAdmin", "Admin", "Editor", "Viewer" };
            foreach (var roleName in roles)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid> { Name = roleName });
                }
            }

            // 2. Initial Admin User
            var adminEmail = config["Admin:Email"] 
                ?? config["SuperAdmin:Email"] 
                ?? "adnanabf@gmail.com";
            var adminPassword = config["Admin:Password"] 
                ?? config["SuperAdmin:Password"] 
                ?? "Admin@Adnan123!";

            var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
            if (existingAdmin == null)
            {
                var admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "Adnan Bin Farook",
                    Role = "Admin",
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };

                var result = await userManager.CreateAsync(admin, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRolesAsync(admin, new[] { "Admin", "SuperAdmin" });
                    logger.LogInformation("Seeded Admin user: {Email}", adminEmail);
                }
                else
                {
                    logger.LogError("Failed to seed Admin user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                if (!await userManager.IsInRoleAsync(existingAdmin, "Admin"))
                {
                    await userManager.AddToRoleAsync(existingAdmin, "Admin");
                    logger.LogInformation("Added Admin role to existing admin user: {Email}", adminEmail);
                }
                if (!await userManager.IsInRoleAsync(existingAdmin, "SuperAdmin"))
                {
                    await userManager.AddToRoleAsync(existingAdmin, "SuperAdmin");
                }
            }

            // 3. Projects
            if (!await context.Projects.AnyAsync())
            {
                var projects = new List<Project>
                {
                    new()
                    {
                        Slug = "viralippurath-family",
                        Title = "Viralippurath Family",
                        Tagline = "A private, full-stack platform built to keep my family organized and connected.",
                        Description = "A private, full-stack platform built to keep my family organized and connected. It replaces messy group chats with a dedicated space for shared schedules, announcements, and task tracking.",
                        HeroImageUrl = "/viralippurath_family.png",
                        Tags = new List<string> { "React", "NestJs", "MongoDB", "Tailwind CSS", "Coolify", "Cloudinary" },
                        LiveUrl = "https://www.viralippurath.com/",
                        GithubUrl = "https://github.com/AdnanABF/Viralippurath-Family",
                        IsFeatured = true,
                        SortOrder = 1,
                        KeyMetricsJson = "[{\"label\": \"Members Connected\", \"value\": \"30+\"}, {\"label\": \"Platform Uptime\", \"value\": \"99.9%\"}]",
                        ContentMarkdown = "### Overview\n\nViralippurath Family platform provides a secure family intranet replacing unstructured messaging channels with persistent calendars, announcements, and document records.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Slug = "gramahub",
                        Title = "GramaHub",
                        Tagline = "A platform for managing and sharing local community information.",
                        Description = "A platform for managing and sharing local community information, events, and managing family and members.",
                        HeroImageUrl = "/og-image.png",
                        Tags = new List<string> { "React", "NestJs", "MongoDB", "Tailwind CSS", "Coolify" },
                        LiveUrl = "",
                        GithubUrl = "https://github.com/AdnanABF/GramaHub",
                        IsFeatured = true,
                        SortOrder = 2,
                        KeyMetricsJson = "[{\"label\": \"Community Members\", \"value\": \"100+\"}]",
                        ContentMarkdown = "### Overview\n\nA scalable community hub managing local events, announcements, and member directories.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Slug = "vacabook",
                        Title = "VacaBook",
                        Tagline = "Vacation rental management with secure payments.",
                        Description = "A full-stack web application for managing vacation rentals, featuring secure payment processing and real-time availability tracking.",
                        HeroImageUrl = "/og-image.png",
                        Tags = new List<string> { "C#", "ASP .NET Core MVC", "MSSQL", "Stripe API", "Apex Charts" },
                        LiveUrl = "",
                        GithubUrl = "https://github.com/AdnanABF/VacaBook",
                        IsFeatured = true,
                        SortOrder = 3,
                        KeyMetricsJson = "[{\"label\": \"Payment Gateway\", \"value\": \"Stripe\"}, {\"label\": \"Analytics\", \"value\": \"ApexCharts\"}]",
                        ContentMarkdown = "### Overview\n\nEnd-to-end rental booking application built with ASP.NET Core MVC, handling real-time calendar reservations and card processing.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };

                await context.Projects.AddRangeAsync(projects);
                logger.LogInformation("Seeded {Count} initial projects", projects.Count);
            }

            // 4. Experience
            if (!await context.Experiences.AnyAsync())
            {
                var experiences = new List<Experience>
                {
                    new()
                    {
                        Role = "Senior Software Engineer",
                        Company = "RM Education Solutions India Pvt Ltd",
                        Location = "Trivandrum, India",
                        Period = "October 2024 - December 2025",
                        Achievements = new List<string>
                        {
                            "Built scalable ASP.NET MVC applications using clean architecture and SOLID principles.",
                            "Developed responsive UIs, secure APIs, and SSO-based identity solutions for enterprise systems.",
                            "Implemented Azure serverless workflows and optimized performance using Redis Cache.",
                            "Managed cloud resources, monitoring, and CI/CD pipelines in Agile delivery environments."
                        },
                        SortOrder = 1
                    },
                    new()
                    {
                        Role = "Software Developer",
                        Company = "Skien Software Lab",
                        Location = "Kochi, India",
                        Period = "August 2022 - December 2023",
                        Achievements = new List<string>
                        {
                            "Built and maintained scalable full-stack web applications, delivering production-ready features end-to-end.",
                            "Designed and optimized databases, REST APIs, and third-party integrations, improving performance by ~35%.",
                            "Contributed across the full SDLC, reducing feature delivery time by ~25%.",
                            "Collaborated with cross-functional teams to deliver stable, high-quality software with minimal defects.",
                            "Authored technical documentation, improving onboarding and knowledge transfer by ~40%."
                        },
                        SortOrder = 2
                    }
                };

                await context.Experiences.AddRangeAsync(experiences);
                logger.LogInformation("Seeded {Count} initial experience items", experiences.Count);
            }

            // 5. Skills
            if (!await context.Skills.AnyAsync())
            {
                var skills = new List<Skill>
                {
                    new() { Name = "C#", Category = "Microsoft", SortOrder = 1 },
                    new() { Name = ".NET Core", Category = "Microsoft", SortOrder = 2 },
                    new() { Name = "ASP .NET Core MVC", Category = "Microsoft", SortOrder = 3 },
                    new() { Name = ".NET Core Web API", Category = "Microsoft", SortOrder = 4 },
                    new() { Name = "MSSQL", Category = "Microsoft", SortOrder = 5 },
                    new() { Name = "PostgreSQL", Category = "Microsoft", SortOrder = 6 },
                    new() { Name = "React", Category = "Modern", SortOrder = 7 },
                    new() { Name = "Next.js", Category = "Modern", SortOrder = 8 },
                    new() { Name = "Node.js", Category = "Modern", SortOrder = 9 },
                    new() { Name = "NestJS", Category = "Modern", SortOrder = 10 },
                    new() { Name = "MongoDB", Category = "Modern", SortOrder = 11 },
                    new() { Name = "TypeScript", Category = "Modern", SortOrder = 12 },
                    new() { Name = "Tailwind CSS", Category = "Modern", SortOrder = 13 },
                    new() { Name = "Docker", Category = "Tools", SortOrder = 14 },
                    new() { Name = "Coolify", Category = "Tools", SortOrder = 15 },
                    new() { Name = "Azure DevOps", Category = "Tools", SortOrder = 16 },
                    new() { Name = "Git", Category = "Tools", SortOrder = 17 }
                };

                await context.Skills.AddRangeAsync(skills);
                logger.LogInformation("Seeded {Count} initial skills", skills.Count);
            }

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

            // 7. Site Settings
            if (!await context.SiteSettings.AnyAsync())
            {
                var settings = new List<SiteSetting>
                {
                    new() { Key = "name", Value = "Adnan Bin Farook" },
                    new() { Key = "headline", Value = "Software Engineer" },
                    new() { Key = "role", Value = "Senior Software Engineer" },
                    new() { Key = "bio", Value = "Software Engineer specializing in modernizing legacy systems and building scalable full-stack applications with .NET, React, and PostgreSQL." },
                    new() { Key = "email", Value = "adnanabf@gmail.com" },
                    new() { Key = "location", Value = "Malappuram, Kerala, India - 679574" },
                    new() { Key = "available_for_hire", Value = "true" },
                    new() { Key = "cv_url", Value = "" },
                    new() { Key = "photo_url", Value = "/adnan_photo.webp" },
                    new() { Key = "social_github", Value = "https://github.com/AdnanABF" },
                    new() { Key = "social_linkedin", Value = "https://www.linkedin.com/in/adnan-here/" }
                };

                await context.SiteSettings.AddRangeAsync(settings);
                logger.LogInformation("Seeded {Count} initial site settings", settings.Count);
            }

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database");
        }
    }
}
