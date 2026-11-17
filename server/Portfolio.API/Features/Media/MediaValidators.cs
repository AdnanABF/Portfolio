using FluentValidation;
using Microsoft.AspNetCore.Http;

namespace Portfolio.API.Features.Media;

public class MediaUploadValidator : AbstractValidator<IFormFile>
{
    private static readonly string[] AllowedExtensions = { ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".pdf" };
    private const long MaxFileSize = 15 * 1024 * 1024; // 15 MB

    public MediaUploadValidator()
    {
        RuleFor(x => x)
            .NotNull().WithMessage("File is required.")
            .Must(x => x != null && x.Length > 0).WithMessage("File cannot be empty.")
            .Must(x => x != null && x.Length <= MaxFileSize).WithMessage("File size exceeds maximum allowed size (15 MB).")
            .Must(x =>
            {
                if (x == null) return false;
                var ext = Path.GetExtension(x.FileName).ToLowerInvariant();
                return AllowedExtensions.Contains(ext);
            }).WithMessage("File format not supported. Allowed formats: PNG, JPG, JPEG, WEBP, SVG, GIF, PDF.");
    }
}
