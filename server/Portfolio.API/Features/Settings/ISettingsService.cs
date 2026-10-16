namespace Portfolio.API.Features.Settings;

public interface ISettingsService
{
    Task<Dictionary<string, string>> GetAllSettingsAsync(CancellationToken cancellationToken = default);
    Task<string> GetSettingAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> UpdateSettingAsync(string key, string value, CancellationToken cancellationToken = default);
}
