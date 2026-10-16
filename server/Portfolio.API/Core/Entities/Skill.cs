using System.ComponentModel.DataAnnotations;

namespace Portfolio.API.Core.Entities;

public class Skill
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty; // "Languages", "Backend", "Frontend", "Cloud", "Databases"

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? IconName { get; set; }

    public int SortOrder { get; set; } = 0;
}
