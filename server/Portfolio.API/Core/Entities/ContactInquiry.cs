using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public static class ContactInquiryTypes
{
    /// <summary>A normal message from the contact form.</summary>
    public const string Contact = "contact";

    /// <summary>A request for access to a private project repository.</summary>
    public const string RepoRequest = "repo_request";

    public static readonly string[] All = { Contact, RepoRequest };

    public static bool IsValid(string? type) => type != null && All.Contains(type.Trim().ToLowerInvariant());
}

/// <summary>The states of an inbox message. Replied implies read; archived messages are hidden from the default view.</summary>
public static class ContactInquiryStatuses
{
    public const string Unread = "unread";
    public const string Read = "read";
    public const string Replied = "replied";
    public const string Archived = "archived";

    public static readonly string[] All = { Unread, Read, Replied, Archived };

    public static bool IsValid(string? status) => status != null && All.Contains(status.Trim().ToLowerInvariant());
}

public class ContactInquiry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = ContactInquiryStatuses.Unread; // see ContactInquiryStatuses

    /// <summary>See <see cref="ContactInquiryTypes"/>.</summary>
    [MaxLength(20)]
    public string Type { get; set; } = ContactInquiryTypes.Contact;

    /// <summary>The project a repo request is about. Null for normal messages, or if the project was deleted.</summary>
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
