using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Experience;

public static class ExperienceMappingExtensions
{
    public static ExperienceDto ToDto(this Core.Entities.Experience exp)
    {
        return new ExperienceDto
        {
            Id = exp.Id,
            Role = exp.Role,
            Company = exp.Company,
            Location = exp.Location,
            Period = exp.Period,
            Achievements = exp.Achievements,
            SortOrder = exp.SortOrder
        };
    }

    public static Core.Entities.Experience ToEntity(this ExperienceUpsertDto dto)
    {
        return new Core.Entities.Experience
        {
            Role = dto.Role,
            Company = dto.Company,
            Location = dto.Location,
            Period = dto.Period,
            Achievements = dto.Achievements,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static void UpdateEntity(this Core.Entities.Experience exp, ExperienceUpsertDto dto)
    {
        exp.Role = dto.Role;
        exp.Company = dto.Company;
        exp.Location = dto.Location;
        exp.Period = dto.Period;
        exp.Achievements = dto.Achievements;
        exp.SortOrder = dto.SortOrder;
    }
}
