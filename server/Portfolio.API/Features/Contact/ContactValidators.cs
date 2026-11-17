using FluentValidation;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Contact;

public class ContactRequestValidator : AbstractValidator<ContactRequestDto>
{
    public ContactRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(150).WithMessage("Email must not exceed 150 characters.");

        RuleFor(x => x.Subject)
            .NotEmpty().WithMessage("Subject is required.")
            .MaximumLength(200).WithMessage("Subject must not exceed 200 characters.");

        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Message is required.")
            .MinimumLength(5).WithMessage("Message must be at least 5 characters long.");
    }
}

public class ContactInquiryQueryValidator : AbstractValidator<ContactInquiryQuery>
{
    public static readonly int[] AllowedPageSizes = { 10, 20, 30, 50 };

    public ContactInquiryQueryValidator()
    {
        RuleFor(x => x.Search)
            .MaximumLength(100).WithMessage("Search must not exceed 100 characters.");

        RuleFor(x => x.Status)
            .Must(s => string.IsNullOrWhiteSpace(s) || ContactInquiryStatuses.IsValid(s))
            .WithMessage("Status must be unread, read, replied or archived.");

        RuleFor(x => x.Type)
            .Must(t => string.IsNullOrWhiteSpace(t) || ContactInquiryTypes.IsValid(t))
            .WithMessage("Type must be contact or repo_request.");

        // Capped so (page - 1) * pageSize cannot overflow an int and turn into a database error.
        RuleFor(x => x.Page)
            .InclusiveBetween(1, Admin.ActivityLogQueryValidator.MaxPage)
            .WithMessage($"Page must be between 1 and {Admin.ActivityLogQueryValidator.MaxPage}.");

        RuleFor(x => x.PageSize)
            .Must(size => AllowedPageSizes.Contains(size))
            .WithMessage("Page size must be 10, 20, 30 or 50.");

        RuleFor(x => x)
            .Must(x => x.From == null || x.To == null || x.From <= x.To)
            .OverridePropertyName("From")
            .WithMessage("The start date must not be after the end date.");
    }
}

public class BulkInquiryStatusValidator : AbstractValidator<BulkInquiryStatusDto>
{
    public const int MaxIds = 100;

    public BulkInquiryStatusValidator()
    {
        RuleFor(x => x.Ids)
            .NotEmpty().WithMessage("Select at least one message.")
            .Must(ids => ids.Count <= MaxIds).WithMessage($"At most {MaxIds} messages can be updated at once.");

        RuleFor(x => x.Status)
            .Must(ContactInquiryStatuses.IsValid)
            .WithMessage("Status must be unread, read, replied or archived.");
    }
}

public class RepoAccessRequestValidator : AbstractValidator<RepoAccessRequestDto>
{
    public RepoAccessRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(150).WithMessage("Email must not exceed 150 characters.");

        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Message is required.")
            .MinimumLength(5).WithMessage("Message must be at least 5 characters long.")
            .MaximumLength(2000).WithMessage("Message must not exceed 2000 characters.");
    }
}
