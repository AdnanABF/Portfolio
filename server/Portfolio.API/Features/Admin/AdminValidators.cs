using FluentValidation;

namespace Portfolio.API.Features.Admin;

/// <summary>Rules for the admin activity-log query (search, filters, date range and paging).</summary>
public class ActivityLogQueryValidator : AbstractValidator<ActivityLogQuery>
{
    public static readonly int[] AllowedPageSizes = { 10, 20, 30, 50 };

    /// <summary>
    /// Highest page number accepted. Without a cap, (page - 1) * pageSize overflows an int for huge values and
    /// the database rejects the negative offset with a 500.
    /// </summary>
    public const int MaxPage = 100_000;

    public ActivityLogQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Search must not exceed 100 characters.");
        RuleFor(x => x.Action).MaximumLength(50).WithMessage("Action must not exceed 50 characters.");
        RuleFor(x => x.EntityType).MaximumLength(100).WithMessage("Entity type must not exceed 100 characters.");
        RuleFor(x => x.Page)
            .InclusiveBetween(1, MaxPage).WithMessage($"Page must be between 1 and {MaxPage}.");
        RuleFor(x => x.PageSize)
            .Must(size => AllowedPageSizes.Contains(size))
            .WithMessage("Page size must be 10, 20, 30 or 50.");
        RuleFor(x => x)
            .Must(x => x.From == null || x.To == null || x.From <= x.To)
            .OverridePropertyName("From")
            .WithMessage("The start date must not be after the end date.");
    }
}

/// <summary>Rules for the admin system-log (error log) query: search, level, date range and paging.</summary>
public class SystemLogQueryValidator : AbstractValidator<SystemLogQuery>
{
    public static readonly string[] Levels = { "Error", "Warning", "Information" };

    public SystemLogQueryValidator()
    {
        RuleFor(x => x.Search).MaximumLength(100).WithMessage("Search must not exceed 100 characters.");
        RuleFor(x => x.Level)
            .Must(l => string.IsNullOrWhiteSpace(l) || Levels.Contains(l, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Level must be Error, Warning or Information.");
        RuleFor(x => x.Page)
            .InclusiveBetween(1, ActivityLogQueryValidator.MaxPage)
            .WithMessage($"Page must be between 1 and {ActivityLogQueryValidator.MaxPage}.");
        RuleFor(x => x.PageSize)
            .Must(size => ActivityLogQueryValidator.AllowedPageSizes.Contains(size))
            .WithMessage("Page size must be 10, 20, 30 or 50.");
        RuleFor(x => x)
            .Must(x => x.From == null || x.To == null || x.From <= x.To)
            .OverridePropertyName("From")
            .WithMessage("The start date must not be after the end date.");
    }
}
