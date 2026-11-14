namespace Portfolio.API.Features.Admin;

public class ActivityLogDto
{
    public Guid Id { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? DetailsJson { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string DeviceInfo { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

/// <summary>Search, filter and paging options for the admin activity log (bound from the query string).</summary>
public class ActivityLogQuery
{
    /// <summary>Matches the action, summary, user email or entity type (case-insensitive, partial).</summary>
    public string? Search { get; set; }
    /// <summary>Exact action, for example USER_LOGIN.</summary>
    public string? Action { get; set; }
    /// <summary>Exact entity type, for example Project.</summary>
    public string? EntityType { get; set; }
    /// <summary>Inclusive lower bound on the log time.</summary>
    public DateTimeOffset? From { get; set; }
    /// <summary>Exclusive upper bound on the log time.</summary>
    public DateTimeOffset? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class ActivityLogPage
{
    public List<ActivityLogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    /// <summary>Distinct actions across all logs (ignores filters), for the filter dropdown.</summary>
    public List<string> Actions { get; set; } = new();
    /// <summary>Distinct entity types across all logs (ignores filters), for the filter dropdown.</summary>
    public List<string> EntityTypes { get; set; } = new();
}

/// <summary>Search, filter and paging options for the admin system (error) log (bound from the query string).</summary>
public class SystemLogQuery
{
    /// <summary>Matches the message, request path or exception text (case-insensitive, partial).</summary>
    public string? Search { get; set; }
    /// <summary>Error, Warning or Information. Empty means every level.</summary>
    public string? Level { get; set; }
    /// <summary>Inclusive lower bound on the log time.</summary>
    public DateTimeOffset? From { get; set; }
    /// <summary>Exclusive upper bound on the log time.</summary>
    public DateTimeOffset? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class SystemLogPage
{
    public List<SystemLogDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    /// <summary>Count per level across all logs (ignores filters).</summary>
    public int ErrorCount { get; set; }
    public int WarningCount { get; set; }
    public int InformationCount { get; set; }
}

public class SystemLogDto
{
    public Guid Id { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? StackTrace { get; set; }
    public string? Path { get; set; }
    public string? HttpMethod { get; set; }
    public int? StatusCode { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}
