using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public static class ContactInquiryTypes
{
    /// <summary>A normal message from the contact form.</summary>
    public const string Contact = "contact";

    /// <summary>A request for access to a private project repository.</summary>
    public const string RepoRequest = "repo_request";
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
    public string Status { get; set; } = "unread"; // "unread", "read", "replied", "starred", "archived"

    /// <summary>See <see cref="ContactInquiryTypes"/>.</summary>
    [MaxLength(20)]
    public string Type { get; set; } = ContactInquiryTypes.Contact;

    /// <summary>The project a repo request is about. Null for normal messages, or if the project was deleted.</summary>
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
