namespace Portfolio.API.Features.Credentials;

public class EducationDto
{
    public Guid Id { get; set; }
    public string Institution { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Details { get; set; } = new();
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

public class EducationUpsertDto
{
    public string Institution { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Details { get; set; } = new();
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

public class CertificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string IssuedOn { get; set; } = string.Empty;
    public string CredentialUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

public class CertificationUpsertDto
{
    public string Title { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string IssuedOn { get; set; } = string.Empty;
    public string CredentialUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}
