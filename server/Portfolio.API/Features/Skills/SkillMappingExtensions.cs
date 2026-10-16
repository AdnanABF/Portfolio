using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Skills;

public static class SkillMappingExtensions
{
    public static SkillDto ToDto(this Skill skill)
    {
        return new SkillDto
        {
            Id = skill.Id,
            Category = skill.Category,
            Name = skill.Name,
            IconName = skill.IconName,
            SortOrder = skill.SortOrder
        };
    }

    public static Skill ToEntity(this SkillUpsertDto dto)
    {
        return new Skill
        {
            Category = dto.Category,
            Name = dto.Name,
            IconName = dto.IconName,
            SortOrder = dto.SortOrder
        };
    }

    public static void UpdateEntity(this Skill skill, SkillUpsertDto dto)
    {
        skill.Category = dto.Category;
        skill.Name = dto.Name;
        skill.IconName = dto.IconName;
        skill.SortOrder = dto.SortOrder;
    }
}
