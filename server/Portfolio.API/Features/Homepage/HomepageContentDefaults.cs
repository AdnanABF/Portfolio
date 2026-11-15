namespace Portfolio.API.Features.Homepage;

/// <summary>
/// The content a new database starts with, written from the owner's CV. It is only used to seed an empty database;
/// after that the admin hub is the source of truth. Phone number and visa details are deliberately left out of the
/// public site.
/// </summary>
public static class HomepageContentDefaults
{
    public static HomepageContent Create(string? photoUrl = null, string? cvUrl = null) => new()
    {
        Profile = new ProfileContent
        {
            Name = "Adnan Bin Farook",
            Role = ".NET Software Engineer",
            Greeting = "Hello, I'm Adnan",
            Headline = "Architecting",
            HeadlineHighlight = "Digital Excellence",
            Subtitle =
                "A .NET software engineer building secure, maintainable web applications and APIs with C#, ASP.NET Core and Azure. " +
                "Now working as a freelance software architect: I design the system, direct AI coding agents to build it, and verify the result with automated tests, CI/CD and hands-on review.",
            PhotoUrl = string.IsNullOrWhiteSpace(photoUrl) ? "/adnan_photo.webp" : photoUrl,
            PhotoAlt = "Adnan Bin Farook",
            CvUrl = cvUrl ?? string.Empty,
            CvButtonLabel = "Download CV",
            ProjectsButtonLabel = "View Projects",
            HireMeLabel = "Hire Me"
        },
        Availability = new AvailabilityContent
        {
            Enabled = true,
            Label = "Available for work",
            Text = "Open to freelance projects and full-time opportunities."
        },
        Location = new LocationContent
        {
            Title = "Based in Kuwait",
            Address = "Jahra, Kuwait",
            TimeZone = "AST (UTC+3)"
        },
        Links =
        [
            new LinkItem { Label = "GitHub", Url = "https://github.com/AdnanABF", Kind = "github" },
            new LinkItem { Label = "LinkedIn", Url = "https://www.linkedin.com/in/adnan-here", Kind = "linkedin" },
            new LinkItem { Label = "Email", Url = "mailto:adnanabf@gmail.com", Kind = "email" }
        ],
        CoreStack =
        [
            "C#", "ASP.NET Core", "Entity Framework", "SQL Server", "Azure", "React",
            "SAML & SSO", "Microsoft Entra ID", "Redis", "GitHub Actions"
        ],
        About = new AboutContent
        {
            Cards =
            [
                new AboutCard
                {
                    Title = "My Journey",
                    Icon = "user", Color = "primary", Size = "large",
                    Text = "I started out building ASP.NET Core MVC applications and APIs, then joined RM Education to work on RM Unify, " +
                           "a single sign-on and identity platform used by UK schools, including Scotland's national Glow platform. " +
                           "Today I work as a freelance software architect, designing systems and directing AI coding agents to build them."
                },
                new AboutCard
                {
                    Title = "Development Philosophy",
                    Icon = "code", Color = "secondary", Size = "large",
                    Text = "I'm a \"build it right\" kind of developer. Solid architecture and clean code come first, because polish doesn't mean much " +
                           "if the foundation is shaky. I keep things secure, tested and easy to use, and I stay accountable for the quality of anything an AI tool writes for me."
                },
                new AboutCard
                {
                    Title = "Tools & Stack",
                    Icon = "cpu", Color = "primary", Size = "small",
                    Text = "C#, ASP.NET Core and Entity Framework for the heavy lifting, SQL Server and MongoDB for data, and React on the front end. " +
                           "Azure Functions and Azure DevOps for cloud and delivery, plus GitHub Actions and self-hosted Linux servers for my own projects."
                },
                new AboutCard
                {
                    Title = "Outside of Code",
                    Icon = "sun", Color = "amber", Size = "small",
                    Text = "When I'm offline, football is my go-to escape, whether I'm playing or over-analyzing tactics from the couch. " +
                           "I'm also a big movie buff and spend time volunteering with a local social club, helping organize sports and arts activities."
                },
                new AboutCard
                {
                    Title = "Future Goals",
                    Icon = "sparkles", Color = "green", Size = "small",
                    Text = "Right now I'm focused on high-scale architecture, identity and security, and on getting the best out of AI-assisted development. " +
                           "I want to keep building systems that solve real problems and contribute more to the open-source projects I use every day."
                }
            ]
        },
        Contact = new ContactContent
        {
            Text = "Interested in building a secure, well-architected platform or modernizing a legacy system? " +
                   "I'm available for freelance projects and full-time opportunities."
        },
        Sections =
        [
            new SectionItem { Id = "about", Label = "About", Eyebrow = "// profile", Title = "About", TitleHighlight = "Me" },
            new SectionItem { Id = "experience", Label = "Experience", Eyebrow = "// career", Title = "Professional", TitleHighlight = "Odyssey" },
            new SectionItem { Id = "education", Label = "Education", Eyebrow = "// learning", Title = "Academic", TitleHighlight = "Background" },
            new SectionItem
            {
                Id = "skills", Label = "Skills", Eyebrow = "// arsenal", Title = "Tech", TitleHighlight = "Arsenal",
                Description = "The languages, frameworks, platforms and tools I work with."
            },
            new SectionItem
            {
                Id = "projects", Label = "Projects", Eyebrow = "// work", Title = "Featured", TitleHighlight = "Deployments",
                Description = "A selection of platforms I have built, from family tools to community hubs to rental management."
            },
            new SectionItem { Id = "certifications", Label = "Certifications", Eyebrow = "// credentials", Title = "Certifications", TitleHighlight = "& Courses" },
            new SectionItem { Id = "contact", Label = "Contact", Title = "Let's", TitleHighlight = "Connect" }
        ],
        Seo = new SeoContent
        {
            Title = "Adnan Bin Farook | .NET Software Engineer - C#, ASP.NET Core, Azure, React",
            Description =
                "Portfolio of Adnan Bin Farook, a .NET software engineer and AI-assisted software architect building secure, scalable web applications and APIs with C#, ASP.NET Core, Azure and React."
        }
    };
}
