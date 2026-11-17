using FluentValidation;

namespace Portfolio.API.Features.Skills;

public class SkillUpsertValidator : AbstractValidator<SkillUpsertDto>
{
    public SkillUpsertValidator()
    {
        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Skill category is required.")
            .MaximumLength(50).WithMessage("Category must not exceed 50 characters.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Skill name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.IconName)
            .MaximumLength(100).WithMessage("IconName must not exceed 100 characters.");
    }
}
