using FluentValidation;

namespace Portfolio.API.Features.Media;

public class PresignedUrlRequestValidator : AbstractValidator<PresignedUrlRequest>
{
    public PresignedUrlRequestValidator()
    {
        RuleFor(x => x.FileName)
            .NotEmpty().WithMessage("FileName is required.");

        RuleFor(x => x.ContentType)
            .NotEmpty().WithMessage("ContentType is required.");
    }
}
