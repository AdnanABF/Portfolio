using Portfolio.API.Core.Entities;

namespace Portfolio.API.Core.Data;

/// <summary>
/// Projects, experience and skills as written in the owner's CV (see <see cref="CvSeeder"/> for when they are applied).
/// To publish a newer CV: update the data here (and the text in HomepageContentDefaults), then change
/// <see cref="Version"/>. The next start of the API on any database replaces the home page content with it.
/// </summary>
public static class CvSeedData
{
    /// <summary>Change this whenever the data below changes, so every database picks the new CV up on its next start.</summary>
    public const string Version = "cv-2026-11-18";

    public static List<Project> Projects() =>
    [
        new()
        {
            Slug = "viralippurath-family",
            Title = "Viralippurath Family Web",
            Tagline = "A community website with events, announcements, a magazine reader and a photo gallery.",
            Description = "A community website with events, announcements, a magazine reader and a photo gallery; images and files are stored on Cloudinary. " +
                          "An admin dashboard manages all the content, with two admin roles (RBAC) and activity and error logs, behind a secure admin login that keeps a JWT in protected cookies.",
            HeroImageUrl = "/viralippurath_family.png",
            Tags = ["ASP.NET Core (.NET 10) API", "React", "Vite", "MongoDB", "Cloudinary", "JWT", "RBAC", "GitHub Actions"],
            LiveUrl = "https://www.viralippurath.com/",
            GithubUrl = "https://github.com/AdnanABF/Viralippurath-Family",
            IsFeatured = true,
            IsPublished = true,
            SortOrder = 1,
            ContentMarkdown = "**Ongoing, 2025** · ASP.NET Core (.NET 10) API, React, Vite, MongoDB\n\n" +
                              "- Community website with events, announcements, a magazine reader and a photo gallery; images and files stored on Cloudinary.\n" +
                              "- Admin dashboard to manage all content, with two admin roles (RBAC) and activity and error logs.\n" +
                              "- Secure admin login using JWT kept in protected cookies.\n" +
                              "- Hosted on a self-hosted Linux server with separate test and live sites, and automatic deployment using GitHub Actions.\n" +
                              "- Built with AI coding tools (ChatGPT Codex, GitHub Copilot, Gemini)."
        },
        new()
        {
            Slug = "gramahub",
            Title = "GramaHub",
            Tagline = "A directory application for managing and browsing the people and user records of a local community.",
            Description = "A directory application for managing and browsing people and user records of a local community.",
            HeroImageUrl = "",
            Tags = ["React", "NestJS", "MongoDB", "Vercel"],
            LiveUrl = "",
            GithubUrl = "https://github.com/AdnanABF/GramaHub",
            IsRepoPrivate = true,
            IsFeatured = true,
            IsPublished = true,
            SortOrder = 2,
            ContentMarkdown = "**Ongoing, 2025** · React, NestJS, MongoDB, Vercel\n\n" +
                              "- Directory application for managing and browsing people and user records of a local community."
        },
        new()
        {
            Slug = "vacabook",
            Title = "Villa Booking Web App",
            Tagline = "A web application for booking and managing villas, with Stripe payments.",
            Description = "A web application for booking and managing villas, with ASP.NET Core Identity for authentication and role management. " +
                          "It takes Stripe payments and uses ApexCharts for the admin dashboard.",
            HeroImageUrl = "",
            Tags = ["ASP.NET Core MVC (.NET 8)", "ASP.NET Core Identity", "Stripe", "ApexCharts"],
            LiveUrl = "",
            GithubUrl = "https://github.com/AdnanABF/VacaBook",
            IsRepoPrivate = true,
            IsFeatured = true,
            IsPublished = true,
            SortOrder = 3,
            ContentMarkdown = "**2024** · ASP.NET Core MVC (.NET 8)\n\n" +
                              "- Web application for booking and managing villas, with ASP.NET Core Identity for authentication and role management.\n" +
                              "- Integrated Stripe payments and ApexCharts for the admin dashboard."
        }
    ];

    public static List<Education> Educations() =>
    [
        new()
        {
            Institution = "MES College of Engineering, Kuttippuram",
            Qualification = "Bachelor of Technology in Information Technology",
            Location = "Kerala, India",
            Period = "2018 - 2022",
            Details = ["Affiliated to APJ Abdul Kalam Technological University."],
            SortOrder = 1
        }
    ];

    public static List<Certification> Certifications() =>
    [
        new() { Title = "Introduction to Software Engineering", Issuer = "IBM", IssuedOn = "January 2026", SortOrder = 1 },
        new() { Title = "C# and .NET", Issuer = "TestDome", IssuedOn = "May 2024", SortOrder = 2 },
        new() { Title = "Intrusion Detection System (IDS) Setup", Issuer = "Virtual Cyber Labs", IssuedOn = "January 2022", SortOrder = 3 }
    ];

    public static List<Experience> Experiences() =>
    [
        new()
        {
            Role = "Software Architect, AI-Assisted Development (Freelance)",
            Company = "Aviation Safety Management System",
            Location = "Remote",
            Period = "September 2026 - Present",
            Achievements =
            [
                "Architected the back-end of an Aviation Safety Management System on the Frappe framework, defining the system design, data models and workflows.",
                "Directed AI coding agents (opencode) to implement custom Frappe DocTypes in a custom app and APIs consumed by a separate React front end, shortening delivery time while retaining ownership of architecture and quality.",
                "Established verification through automated back-end and front-end tests, linting, pre-commit checks, GitHub Actions deployments with health checks, and manual testing of critical and edge cases from AI-generated test plans."
            ],
            SortOrder = 1
        },
        new()
        {
            Role = "Senior Software Engineer",
            Company = "RM Education Solutions India Pvt Ltd",
            Location = "Trivandrum, Kerala",
            Period = "October 2024 - December 2025",
            Achievements =
            [
                "Delivered features for RM Unify, a cloud-hosted single sign-on and identity management platform serving UK schools, colleges and trusts, using ASP.NET MVC (.NET Framework 4.8), Knockout.js, clean architecture and SOLID principles in an Agile team.",
                "Led implementation planning for assigned features and took part in design discussions with the lead, manager and architect.",
                "Implemented Single Sign-On (SSO) and federated authentication with SAML and WS-Federation, securing access for connected applications.",
                "Centralised identity and access management with Microsoft Entra ID, Microsoft Graph API and Active Directory, including RBAC and group policies; integrated Google Directory and Classroom APIs for identity management in Google.",
                "Applied Redis Cache to high-traffic modules to reduce database load; designed and consumed secure APIs with authentication, validation and audit logging.",
                "Built serverless workflows with Azure Functions and Azure Queues.",
                "Monitored production with Application Insights and shipped through CI/CD pipelines alongside QA and DevOps teams.",
                "Trained and onboarded 3 junior engineers and new joiners; served as Configuration Lead, maintaining project documents, risk and quality registers, and the team call tree and org tree."
            ],
            SortOrder = 2
        },
        new()
        {
            Role = "Software Developer",
            Company = "Skien Software Lab",
            Location = "Trivandrum, Kerala",
            Period = "August 2022 - December 2023",
            Achievements =
            [
                "Built and maintained server-side logic and user interfaces with ASP.NET Core MVC (.NET 7).",
                "Designed and optimised data access using Entity Framework and stored procedures, improving query performance by 20%.",
                "Developed secure APIs for external integration and integrated third-party APIs.",
                "Contributed to hybrid mobile applications using AngularJS and Apache Cordova."
            ],
            SortOrder = 3
        }
    ];

    public static List<Skill> Skills()
    {
        var groups = new (string Category, string[] Names)[]
        {
            ("Languages", ["C#", "SQL", "JavaScript", "HTML/CSS"]),
            (".NET & Backend", [
                "ASP.NET Core MVC (.NET 7/8/10)", "ASP.NET Core Web API", "ASP.NET MVC (.NET Framework 4.8)",
                "REST API design", "Entity Framework", "Stored procedure optimization"]),
            ("Frontend", ["React", "Knockout.js", "jQuery", "AngularJS"]),
            ("Identity & Security", [
                "SAML", "WS-Federation", "Single Sign-On (SSO)", "Microsoft Entra ID", "Microsoft Graph API",
                "Active Directory", "JWT authentication", "RBAC", "ASP.NET Core Identity", "Google Directory and Classroom APIs"]),
            ("Cloud & DevOps", [
                "Azure Functions", "Azure Queues", "Azure Tables", "Application Insights", "Azure DevOps (CI/CD)",
                "GitHub", "GitHub Actions", "Vercel", "Self-hosted Linux VPS (Ubuntu, Coolify, Dokku, firewall hardening)"]),
            ("Databases & Caching", ["SQL Server", "MongoDB", "Redis Cache"]),
            ("Testing & Quality", [
                "Unit and integration testing", "Frappe test framework", "Apache JMeter", "Postman", "Ruff", "ESLint",
                "SOLID principles", "Clean architecture"]),
            ("Tools", ["Visual Studio", "VS Code", "SSMS"]),
            ("AI-Assisted Development", [
                "Agentic software development", "opencode", "Claude Code", "GitHub Copilot", "ChatGPT Codex", "Gemini & Antigravity"])
        };

        var skills = new List<Skill>();
        var order = 1;
        foreach (var (category, names) in groups)
        {
            foreach (var name in names)
            {
                skills.Add(new Skill { Category = category, Name = name, SortOrder = order++ });
            }
        }

        return skills;
    }
}
