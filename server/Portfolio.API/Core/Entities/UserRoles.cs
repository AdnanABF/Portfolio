using System.Linq.Expressions;

namespace Portfolio.API.Core.Entities;

/// <summary>Role names. SuperAdmin is the single immutable owner account, Admin may edit content, Member is a signed-in visitor.</summary>
public static class UserRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string Member = "Member";

    /// <summary>Roles the members panel may assign. SuperAdmin is never assignable.</summary>
    public static readonly string[] Assignable = { Admin, Member };

    public static readonly string[] All = { SuperAdmin, Admin, Member };

    /// <summary>True for the roles that can use the admin area.</summary>
    public static bool IsAdminCapable(string role) => role == SuperAdmin || role == Admin;
}

/// <summary>
/// Account status shown in the members panel. It is worked out from the user row, in this order:
/// Deleted, Inactive, Pending (email not confirmed yet), Active.
/// </summary>
public static class UserStatuses
{
    public const string Active = "active";
    public const string Pending = "pending";
    public const string Inactive = "inactive";
    public const string Deleted = "deleted";

    public static readonly string[] All = { Active, Pending, Inactive, Deleted };

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value, StringComparer.OrdinalIgnoreCase);

    public static string Of(ApplicationUser user) => Of(user.DeletedAt, user.IsActive, user.EmailConfirmed);

    /// <summary>The status of a user from the three columns that decide it. This is the rule; the filters below must agree with it.</summary>
    public static string Of(DateTime? deletedAt, bool isActive, bool emailConfirmed) =>
        deletedAt != null ? Deleted
        : !isActive ? Inactive
        : !emailConfirmed ? Pending
        : Active;

    // The same rule as SQL conditions, for filtering a list in the database. Kept next to Of() on purpose.
    public static readonly Expression<Func<ApplicationUser, bool>> WhereNotDeleted = u => u.DeletedAt == null;
    public static readonly Expression<Func<ApplicationUser, bool>> WhereDeleted = u => u.DeletedAt != null;
    public static readonly Expression<Func<ApplicationUser, bool>> WhereInactive = u => u.DeletedAt == null && !u.IsActive;
    public static readonly Expression<Func<ApplicationUser, bool>> WherePending = u => u.DeletedAt == null && u.IsActive && !u.EmailConfirmed;
    public static readonly Expression<Func<ApplicationUser, bool>> WhereActive = u => u.DeletedAt == null && u.IsActive && u.EmailConfirmed;

    /// <summary>The SQL condition for a status, or null for an unknown or empty one.</summary>
    public static Expression<Func<ApplicationUser, bool>>? Filter(string? status) => status?.Trim().ToLowerInvariant() switch
    {
        Deleted => WhereDeleted,
        Inactive => WhereInactive,
        Pending => WherePending,
        Active => WhereActive,
        _ => null
    };
}
