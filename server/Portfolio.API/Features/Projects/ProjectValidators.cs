using FluentValidation;
using Portfolio.API.Features.Homepage;

namespace Portfolio.API.Features.Projects;

public class ProjectUpsertValidator : AbstractValidator<ProjectUpsertDto>
{
    public ProjectUpsertValidator()
    {
        RuleFor(x => x.Slug)
            .NotEmpty().WithMessage("Project slug is required.")
            .MaximumLength(100).WithMessage("Slug must not exceed 100 characters.")
            .Matches("^[a-z0-9-]+$").WithMessage("Slug must only contain lowercase alphanumeric characters and hyphens.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Project title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Tagline)
            .MaximumLength(300).WithMessage("Tagline must not exceed 300 characters.");

        const string urlMessage = "Use a link that starts with https://, mailto:, tel: or /.";
        RuleFor(x => x.HeroImageUrl).MaximumLength(500).Must(HomepageContentValidator.IsSafeUrl).WithMessage(urlMessage);
        RuleFor(x => x.LiveUrl).MaximumLength(500).Must(HomepageContentValidator.IsSafeUrl).WithMessage(urlMessage);
        RuleFor(x => x.GithubUrl).MaximumLength(500).Must(HomepageContentValidator.IsSafeUrl).WithMessage(urlMessage);
    }
}
