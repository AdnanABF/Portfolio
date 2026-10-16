using FluentValidation;

namespace Portfolio.API.Features.Blog;

public class BlogPostUpsertValidator : AbstractValidator<BlogPostUpsertDto>
{
    public BlogPostUpsertValidator()
    {
        RuleFor(x => x.Slug)
            .NotEmpty().WithMessage("Blog slug is required.")
            .MaximumLength(150).WithMessage("Slug must not exceed 150 characters.")
            .Matches("^[a-z0-9-]+$").WithMessage("Slug must only contain lowercase alphanumeric characters and hyphens.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Blog title is required.")
            .MaximumLength(250).WithMessage("Title must not exceed 250 characters.");

        RuleFor(x => x.Excerpt)
            .MaximumLength(500).WithMessage("Excerpt must not exceed 500 characters.");
    }
}
