using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Logging;

namespace Portfolio.API.Features.Settings;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;
    private readonly IOutputCacheStore _cacheStore;

    public SettingsService(
        AppDbContext context,
        IActivityLogger activityLogger,
        IOutputCacheStore cacheStore)
    {
        _context = context;
        _activityLogger = activityLogger;
        _cacheStore = cacheStore;
    }

    public async Task<Dictionary<string, string>> GetAllSettingsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SiteSettings
            .AsNoTracking()
            .ToDictionaryAsync(s => s.Key, s => s.Value, cancellationToken);
    }

    public async Task<string> GetSettingAsync(string key, CancellationToken cancellationToken = default)
    {
        var setting = await _context.SiteSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key.ToLower() == key.ToLower(), cancellationToken);

        return setting?.Value ?? string.Empty;
    }

    public async Task<bool> UpdateSettingAsync(string key, string value, CancellationToken cancellationToken = default)
    {
        var setting = await _context.SiteSettings.FindAsync(new object[] { key }, cancellationToken);
        if (setting == null)
        {
            setting = new SiteSetting
            {
                Key = key,
                Value = value,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.SiteSettings.AddAsync(setting, cancellationToken);
        }
        else
        {
            setting.Value = value;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _activityLogger.LogAsync("SETTING_UPDATE", "SiteSetting", key, $"Updated setting '{key}' to '{value}'");
        await _cacheStore.EvictByTagAsync("settings", cancellationToken);

        return true;
    }
}
