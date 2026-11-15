namespace Portfolio.API.Features.Users;

/// <summary>Search, filter and paging options for the members list (bound from the query string).</summary>
public class MemberQuery
{
    /// <summary>Matches the name, email or username (case-insensitive, partial).</summary>
    public string? Search { get; set; }

    /// <summary>SuperAdmin, Admin or Member. Empty means every role.</summary>
    public string? Role { get; set; }

    /// <summary>active, pending, inactive or deleted. Empty means everyone except deleted members.</summary>
    public string? Status { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class MemberDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;

    /// <summary>active, pending, inactive or deleted.</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>The owner account. It cannot be changed, turned off or deleted.</summary>
    public bool IsSuperAdmin { get; set; }

    public bool EmailConfirmed { get; set; }

    /// <summary>False when the member is turned off. Together with EmailConfirmed and DeletedAt it decides the status.</summary>
    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginMethod { get; set; }
    public string? LastLoginIp { get; set; }
    public DateTime? DeletedAt { get; set; }

    /// <summary>Sessions that are signed in right now (not revoked, not expired).</summary>
    public int ActiveSessions { get; set; }
}

/// <summary>Counts for the whole user table. They ignore the list's search and filters.</summary>
public class MemberStats
{
    /// <summary>Everyone who is not soft-deleted.</summary>
    public int TotalUsers { get; set; }
    public int Active { get; set; }
    public int Pending { get; set; }
    public int Inactive { get; set; }
    public int Deleted { get; set; }
    public int Admins { get; set; }
    public int Members { get; set; }

    /// <summary>Users (not deleted) who signed in during the last 30 days.</summary>
    public int LoggedInLast30Days { get; set; }
}

public class MemberPage
{
    public List<MemberDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public MemberStats Stats { get; set; } = new();
}

public class MemberCreateDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Admin or Member.</summary>
    public string Role { get; set; } = "Member";
}

public class MemberUpdateDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Admin or Member.</summary>
    public string Role { get; set; } = "Member";
}

/// <summary>Permanent erase. The email must be typed again as a safety check.</summary>
public class EraseMemberDto
{
    public string ConfirmEmail { get; set; } = string.Empty;
}

/// <summary>Response for actions that may send an email, so the panel can say when the email did not go out.</summary>
public class MemberActionResult
{
    public MemberDto Member { get; set; } = new();
    public bool EmailSent { get; set; }
}
