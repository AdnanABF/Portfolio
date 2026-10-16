namespace Portfolio.API.Features.Skills;

public class SkillDto
{
    public Guid Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public int SortOrder { get; set; }
}

public class SkillUpsertDto
{
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public int SortOrder { get; set; }
}
