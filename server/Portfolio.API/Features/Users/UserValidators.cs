using FluentValidation;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Admin;

namespace Portfolio.API.Features.Users;

/// <summary>Rules for the members list query (search, role, status and paging).</summary>
public class MemberQueryValidator : AbstractValidator<MemberQuery>
{
    public MemberQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Search must not exceed 100 characters.");

        RuleFor(x => x.Role)
            .Must(r => string.IsNullOrWhiteSpace(r) || UserRoles.All.Contains(r, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Role must be SuperAdmin, Admin or Member.");

        RuleFor(x => x.Status)
            .Must(s => string.IsNullOrWhiteSpace(s) || UserStatuses.IsValid(s))
            .WithMessage("Status must be active, pending, inactive or deleted.");

        RuleFor(x => x.Page)
            .InclusiveBetween(1, ActivityLogQueryValidator.MaxPage)
            .WithMessage($"Page must be between 1 and {ActivityLogQueryValidator.MaxPage}.");

        RuleFor(x => x.PageSize)
            .Must(size => ActivityLogQueryValidator.AllowedPageSizes.Contains(size))
            .WithMessage("Page size must be 10, 20, 30 or 50.");
    }
}

/// <summary>Rules for adding a member. The role can only be Admin or Member: SuperAdmin is never assignable.</summary>
public class MemberCreateValidator : AbstractValidator<MemberCreateDto>
{
    public MemberCreateValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(150).WithMessage("Email must not exceed 150 characters.");

        RuleFor(x => x.Role)
            .Must(r => UserRoles.Assignable.Contains(r))
            .WithMessage("Role must be Admin or Member.");
    }
}

/// <summary>Rules for editing a member.</summary>
public class MemberUpdateValidator : AbstractValidator<MemberUpdateDto>
{
    public MemberUpdateValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(150).WithMessage("Email must not exceed 150 characters.");

        RuleFor(x => x.Role)
            .Must(r => UserRoles.Assignable.Contains(r))
            .WithMessage("Role must be Admin or Member.");
    }
}

public class EraseMemberValidator : AbstractValidator<EraseMemberDto>
{
    public EraseMemberValidator()
    {
        RuleFor(x => x.ConfirmEmail).NotEmpty().WithMessage("Type the member's email to confirm.");
    }
}
