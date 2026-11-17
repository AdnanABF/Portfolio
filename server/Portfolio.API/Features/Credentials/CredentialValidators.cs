using FluentValidation;
using Portfolio.API.Features.Homepage;

namespace Portfolio.API.Features.Credentials;

public class EducationUpsertValidator : AbstractValidator<EducationUpsertDto>
{
    public EducationUpsertValidator()
    {
        RuleFor(x => x.Institution).NotEmpty().WithMessage("Institution is required.").MaximumLength(150);
        RuleFor(x => x.Qualification).NotEmpty().WithMessage("Qualification is required.").MaximumLength(150);
        RuleFor(x => x.Location).MaximumLength(100);
        RuleFor(x => x.Period).MaximumLength(100);
        RuleFor(x => x.Details).NotNull().Must(d => d.Count <= 20).WithMessage("Add at most 20 detail points.");
        RuleForEach(x => x.Details).NotEmpty().MaximumLength(500).WithMessage("A detail point must not exceed 500 characters.");
    }
}

public class CertificationUpsertValidator : AbstractValidator<CertificationUpsertDto>
{
    public CertificationUpsertValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Title is required.").MaximumLength(200);
        RuleFor(x => x.Issuer).MaximumLength(150);
        RuleFor(x => x.IssuedOn).MaximumLength(100);
        RuleFor(x => x.CredentialUrl)
            .MaximumLength(500)
            .Must(HomepageContentValidator.IsSafeUrl)
            .WithMessage("Use a link that starts with https://, mailto:, tel: or /.");
    }
}
