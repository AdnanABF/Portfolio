using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace Portfolio.API.Features.Settings;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly IValidator<SiteSettingUpdateDto> _validator;

    public SettingsController(ISettingsService settingsService, IValidator<SiteSettingUpdateDto> validator)
    {
        _settingsService = settingsService;
        _validator = validator;
    }

    [HttpGet]
    [OutputCache(Tags = ["settings"])]
    public async Task<ActionResult<Dictionary<string, string>>> GetAll(CancellationToken cancellationToken)
    {
        var settings = await _settingsService.GetAllSettingsAsync(cancellationToken);
        return Ok(settings);
    }

    [HttpGet("{key}")]
    [OutputCache(Tags = ["settings"])]
    public async Task<ActionResult<string>> GetByKey(string key, CancellationToken cancellationToken)
    {
        var value = await _settingsService.GetSettingAsync(key, cancellationToken);
        return Ok(value);
    }

    [HttpPut("{key}")]
    [Authorize(Roles = "SuperAdmin,Editor")]
    public async Task<IActionResult> Update(string key, [FromBody] SiteSettingUpdateDto dto, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(dto, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        await _settingsService.UpdateSettingAsync(key, dto.Value, cancellationToken);
        return Ok(new { key, value = dto.Value });
    }
}
