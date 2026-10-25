namespace Portfolio.API.Features.Experience;

public class ExperienceDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Achievements { get; set; } = new();
    public int SortOrder { get; set; }
}

public class ExperienceUpsertDto
{
    public string Role { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public List<string> Achievements { get; set; } = new();
    public int SortOrder { get; set; }
}
