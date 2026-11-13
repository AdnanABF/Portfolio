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
