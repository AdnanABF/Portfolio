using FluentValidation;

namespace Portfolio.API.Features.Homepage;

public class HomepageContentValidator : AbstractValidator<HomepageContent>
{
    public HomepageContentValidator()
    {
        RuleFor(x => x.Profile).NotNull().SetValidator(new ProfileValidator());
        RuleFor(x => x.Availability).NotNull().SetValidator(new AvailabilityValidator());
        RuleFor(x => x.Location).NotNull().SetValidator(new LocationValidator());
        RuleFor(x => x.About).NotNull().SetValidator(new AboutValidator());
        RuleFor(x => x.Contact).NotNull().SetValidator(new ContactValidator());
        RuleFor(x => x.Seo).NotNull().SetValidator(new SeoValidator());

        RuleFor(x => x.Links)
            .NotNull()
            .Must(l => l.Count <= HomepageContentRules.MaxLinks)
            .WithMessage($"Add at most {HomepageContentRules.MaxLinks} links.");
        RuleForEach(x => x.Links).SetValidator(new LinkValidator());

        RuleFor(x => x.CoreStack)
            .NotNull()
            .Must(c => c.Count <= HomepageContentRules.MaxCoreStack)
            .WithMessage($"Add at most {HomepageContentRules.MaxCoreStack} core stack items.");
        RuleForEach(x => x.CoreStack)
            .NotEmpty().WithMessage("Core stack items cannot be empty.")
            .MaximumLength(40).WithMessage("A core stack item must not exceed 40 characters.");

        RuleFor(x => x.Sections)
            .NotNull()
            .Must(HasEverySectionOnce)
            .WithMessage("Sections must list about, experience, education, skills, projects, certifications and contact exactly once each.");
        RuleForEach(x => x.Sections).SetValidator(new SectionValidator());
    }

    private static bool HasEverySectionOnce(List<SectionItem> sections) =>
        sections.Count == HomepageContentRules.SectionIds.Length
        && HomepageContentRules.SectionIds.All(id => sections.Count(s => s.Id == id) == 1);

    /// <summary>
    /// Addresses the content may link to or load: this site (a path or anchor), https, mailto and tel.
    /// Anything else, such as javascript: or data:, is refused because these values end up in links and images.
    /// </summary>
    public static bool IsSafeUrl(string? value)
    {
        if (string.IsNullOrEmpty(value)) return true;
        if (value.Any(char.IsControl) || value.Contains('\\') || value.Contains(' ')) return false;
        if (value.StartsWith('/')) return !value.StartsWith("//");
        return value.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("tel:", StringComparison.OrdinalIgnoreCase);
    }

    private const string UrlMessage = "Use a link that starts with https://, mailto:, tel: or /.";

    private sealed class ProfileValidator : AbstractValidator<ProfileContent>
    {
        public ProfileValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
            RuleFor(x => x.Role).NotEmpty().MaximumLength(80);
            RuleFor(x => x.Greeting).MaximumLength(80);
            RuleFor(x => x.Headline).MaximumLength(80);
            RuleFor(x => x.HeadlineHighlight).MaximumLength(80);
            RuleFor(x => x.Subtitle).MaximumLength(600);
            RuleFor(x => x.PhotoUrl).MaximumLength(500).Must(IsSafeUrl).WithMessage(UrlMessage);
            RuleFor(x => x.PhotoAlt).MaximumLength(150);
            RuleFor(x => x.CvUrl).MaximumLength(500).Must(IsSafeUrl).WithMessage(UrlMessage);
            RuleFor(x => x.CvButtonLabel).MaximumLength(40);
            RuleFor(x => x.ProjectsButtonLabel).MaximumLength(40);
            RuleFor(x => x.HireMeLabel).NotEmpty().MaximumLength(30);
        }
    }

    private sealed class AvailabilityValidator : AbstractValidator<AvailabilityContent>
    {
        public AvailabilityValidator()
        {
            RuleFor(x => x.Label).MaximumLength(60);
            RuleFor(x => x.Text).MaximumLength(300);
        }
    }

    private sealed class LocationValidator : AbstractValidator<LocationContent>
    {
        public LocationValidator()
        {
            RuleFor(x => x.Title).MaximumLength(80);
            RuleFor(x => x.Address).MaximumLength(200);
            RuleFor(x => x.TimeZone).MaximumLength(60);
        }
    }

    private sealed class LinkValidator : AbstractValidator<LinkItem>
    {
        public LinkValidator()
        {
            RuleFor(x => x.Id).NotEmpty().MaximumLength(40);
            RuleFor(x => x.Label).NotEmpty().MaximumLength(40);
            RuleFor(x => x.Url).NotEmpty().MaximumLength(500).Must(IsSafeUrl).WithMessage(UrlMessage);
            RuleFor(x => x.Kind).Must(k => HomepageContentRules.LinkKinds.Contains(k))
                .WithMessage("Choose a link type from the list.");
        }
    }

    private sealed class AboutValidator : AbstractValidator<AboutContent>
    {
        public AboutValidator()
        {
            RuleFor(x => x.Cards)
                .NotNull()
                .Must(c => c.Count <= HomepageContentRules.MaxAboutCards)
                .WithMessage($"Add at most {HomepageContentRules.MaxAboutCards} cards.");
            RuleForEach(x => x.Cards).SetValidator(new AboutCardValidator());
        }
    }

    private sealed class AboutCardValidator : AbstractValidator<AboutCard>
    {
        public AboutCardValidator()
        {
            RuleFor(x => x.Id).NotEmpty().MaximumLength(40);
            RuleFor(x => x.Title).NotEmpty().MaximumLength(60);
            RuleFor(x => x.Text).NotEmpty().MaximumLength(1200);
            RuleFor(x => x.Icon).Must(i => HomepageContentRules.Icons.Contains(i)).WithMessage("Choose an icon from the list.");
            RuleFor(x => x.Color).Must(c => HomepageContentRules.Colors.Contains(c)).WithMessage("Choose a colour from the list.");
            RuleFor(x => x.Size).Must(s => HomepageContentRules.Sizes.Contains(s)).WithMessage("Choose large or small.");
        }
    }

    private sealed class ContactValidator : AbstractValidator<ContactContent>
    {
        public ContactValidator()
        {
            RuleFor(x => x.Text).MaximumLength(600);
        }
    }

    private sealed class SectionValidator : AbstractValidator<SectionItem>
    {
        public SectionValidator()
        {
            RuleFor(x => x.Label).NotEmpty().MaximumLength(30);
            RuleFor(x => x.Eyebrow).MaximumLength(40);
            RuleFor(x => x.Title).MaximumLength(60);
            RuleFor(x => x.TitleHighlight).MaximumLength(60);
            RuleFor(x => x.Description).MaximumLength(300);
        }
    }

    private sealed class SeoValidator : AbstractValidator<SeoContent>
    {
        public SeoValidator()
        {
            RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
            RuleFor(x => x.Description).MaximumLength(300);
        }
    }
}
