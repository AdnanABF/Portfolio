namespace Portfolio.API.Features.Homepage;

/// <summary>
/// Everything on the public home page that is plain content, as one document. Experience, skills and projects are
/// separate lists with their own tables. Serialized as camelCase JSON; a field missing from stored JSON keeps the
/// default below, so adding a field later never breaks older rows.
/// </summary>
public class HomepageContent
{
    public ProfileContent Profile { get; set; } = new();
    public AvailabilityContent Availability { get; set; } = new();
    public LocationContent Location { get; set; } = new();
    public List<LinkItem> Links { get; set; } = new();

    /// <summary>The short list of skills shown as chips in the hero area.</summary>
    public List<string> CoreStack { get; set; } = new();

    public AboutContent About { get; set; } = new();
    public ContactContent Contact { get; set; } = new();

    /// <summary>The page sections after the hero, in display order. The navigation bar uses the same list.</summary>
    public List<SectionItem> Sections { get; set; } = new();

    public SeoContent Seo { get; set; } = new();
}

public class ProfileContent
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The line under the name in the navigation bar, for example "Software Engineer".</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>The yellow tag next to the photo, for example "Hello, I'm Adnan".</summary>
    public string Greeting { get; set; } = string.Empty;

    /// <summary>The big title: this text, then <see cref="HeadlineHighlight"/> in the gradient colour.</summary>
    public string Headline { get; set; } = string.Empty;

    public string HeadlineHighlight { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;

    public string PhotoUrl { get; set; } = string.Empty;
    public string PhotoAlt { get; set; } = string.Empty;

    /// <summary>Link to the CV file. Empty hides the Download CV button.</summary>
    public string CvUrl { get; set; } = string.Empty;

    public string CvButtonLabel { get; set; } = "Download CV";

    /// <summary>Empty hides the second hero button.</summary>
    public string ProjectsButtonLabel { get; set; } = "View Projects";

    public string HireMeLabel { get; set; } = "Hire Me";
}

public class AvailabilityContent
{
    public bool Enabled { get; set; } = true;
    public string Label { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class LocationContent
{
    public string Title { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string TimeZone { get; set; } = string.Empty;
}

public class LinkItem
{
    /// <summary>Stable id the admin hub uses to track the item while it is edited or moved.</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string Label { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    /// <summary>Picks the icon. One of <see cref="HomepageContentRules.LinkKinds"/>.</summary>
    public string Kind { get; set; } = "website";

    /// <summary>Whether the link also shows as an icon in the hero.</summary>
    public bool ShowInHero { get; set; } = true;
}

public class AboutContent
{
    public List<AboutCard> Cards { get; set; } = new();
}

public class AboutCard
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;

    /// <summary>One of <see cref="HomepageContentRules.Icons"/>.</summary>
    public string Icon { get; set; } = "user";

    /// <summary>One of <see cref="HomepageContentRules.Colors"/>.</summary>
    public string Color { get; set; } = "primary";

    /// <summary>"large" cards take half the row, "small" cards a third.</summary>
    public string Size { get; set; } = "small";
}

public class ContactContent
{
    /// <summary>The paragraph under the Contact heading.</summary>
    public string Text { get; set; } = string.Empty;
}

public class SectionItem
{
    /// <summary>One of <see cref="HomepageContentRules.SectionIds"/>.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>The name shown in the navigation bar.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Off hides both the section on the page and its navigation link.</summary>
    public bool Enabled { get; set; } = true;

    // The section's heading: a small line above, the title (the highlight part is shown in the accent colour),
    // and a short description below. All optional.
    public string Eyebrow { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string TitleHighlight { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SeoContent
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

/// <summary>The fixed choices the content may use. The client has the same lists, so the two must change together.</summary>
public static class HomepageContentRules
{
    public static readonly string[] SectionIds = ["about", "experience", "education", "skills", "projects", "certifications", "contact"];
    public static readonly string[] LinkKinds = ["github", "linkedin", "email", "website", "phone", "other"];
    public static readonly string[] Icons =
        ["user", "code", "cpu", "sun", "sparkles", "heart", "book", "rocket", "globe", "briefcase", "shield", "coffee"];
    public static readonly string[] Colors = ["primary", "secondary", "amber", "green", "sky", "coral"];
    public static readonly string[] Sizes = ["large", "small"];

    public const int MaxLinks = 12;
    public const int MaxCoreStack = 20;
    public const int MaxAboutCards = 12;
}
