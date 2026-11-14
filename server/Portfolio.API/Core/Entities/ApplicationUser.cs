using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Portfolio.API.Core.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>Primary role name (SuperAdmin, Admin or Member). Kept in step with the Identity role rows.</summary>
    [MaxLength(50)]
    public string Role { get; set; } = UserRoles.Member;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    /// <summary>How the member last signed in, for example "Password".</summary>
    [MaxLength(50)]
    public string? LastLoginMethod { get; set; }

    [MaxLength(50)]
    public string? LastLoginIp { get; set; }

    /// <summary>False blocks sign-in. Turning it off also revokes every session of the member.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Set when the member is soft-deleted. The record is kept and can be restored.</summary>
    public DateTime? DeletedAt { get; set; }

    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
}
