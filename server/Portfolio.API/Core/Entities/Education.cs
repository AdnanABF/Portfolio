using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

/// <summary>A school, college or university the owner studied at, shown in the Education section.</summary>
public class Education
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The school, college or university.</summary>
    [MaxLength(150)]
    public string Institution { get; set; } = string.Empty;

    /// <summary>The degree, diploma or course, for example "Bachelor of Technology in Information Technology".</summary>
    [MaxLength(150)]
    public string Qualification { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Location { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Period { get; set; } = string.Empty;

    /// <summary>Extra points shown when the entry is expanded (university, grade, activities, ...).</summary>
    public List<string> Details { get; set; } = new();

    public int SortOrder { get; set; } = 0;

    /// <summary>Hidden items stay in the admin hub but are not shown on the public site.</summary>
    public bool IsVisible { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A certificate or course the owner completed, shown in the Certifications section.</summary>
public class Certification
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>Who issued it, for example "IBM".</summary>
    [MaxLength(150)]
    public string Issuer { get; set; } = string.Empty;

    /// <summary>When it was earned, as text ("January 2026").</summary>
    [MaxLength(100)]
    public string IssuedOn { get; set; } = string.Empty;

    /// <summary>Optional link to the credential. Empty hides the link.</summary>
    [MaxLength(500)]
    public string CredentialUrl { get; set; } = string.Empty;

    public int SortOrder { get; set; } = 0;

    public bool IsVisible { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
