using FluentValidation;

namespace Portfolio.API.Features.Settings;

public class SiteSettingUpdateValidator : AbstractValidator<SiteSettingUpdateDto>
{
    public SiteSettingUpdateValidator()
    {
        RuleFor(x => x.Value)
            .NotNull().WithMessage("Setting value cannot be null.");
    }
}
