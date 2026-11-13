namespace Portfolio.API.Features.Contact;

public class ContactRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Body of POST /api/projects/{slug}/access-requests. The subject and the project come from the
/// server (the slug in the route), never from the request body.
/// </summary>
public class RepoAccessRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

/// <summary>Search, filter and paging options for the admin inbox (bound from the query string).</summary>
public class ContactInquiryQuery
{
    /// <summary>Matches the name, email, subject or message body (case-insensitive, partial).</summary>
    public string? Search { get; set; }

    /// <summary>unread, read, replied or archived. Empty means everything except archived.</summary>
    public string? Status { get; set; }

    /// <summary>contact or repo_request. Empty means both.</summary>
    public string? Type { get; set; }

    /// <summary>Only messages received at or after this moment.</summary>
    public DateTimeOffset? From { get; set; }

    /// <summary>Only messages received before this moment.</summary>
    public DateTimeOffset? To { get; set; }

    public int Page { get; set; } = 1;

    /// <summary>10, 20, 30 or 50.</summary>
    public int PageSize { get; set; } = 10;
}

public class ContactInquiryPage
{
    public List<ContactInquiryDto> Items { get; set; } = new();

    /// <summary>Messages matching the filters, across all pages.</summary>
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }

    /// <summary>All unread messages, whatever the filters are.</summary>
    public int UnreadCount { get; set; }
}

public class BulkInquiryStatusDto
{
    public List<Guid> Ids { get; set; } = new();
    public string Status { get; set; } = string.Empty;
}

public class ContactInquiryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "unread";

    /// <summary>"contact" or "repo_request".</summary>
    public string Type { get; set; } = "contact";
    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }
    public string? ProjectSlug { get; set; }

    public DateTime CreatedAt { get; set; }
}
