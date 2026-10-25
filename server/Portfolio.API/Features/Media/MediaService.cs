using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Features.Media;

public class MediaService : IMediaService
{
    private readonly AppDbContext _dbContext;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<MediaService> _logger;
    private readonly string _uploadsRoot;

    public MediaService(
        AppDbContext dbContext,
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<MediaService> logger)
    {
        _dbContext = dbContext;
        _env = env;
        _config = config;
        _logger = logger;
        
        _uploadsRoot = _config["Storage:LocalPath"] ?? Path.Combine(_env.ContentRootPath, "uploads");
        if (!Directory.Exists(_uploadsRoot))
        {
            Directory.CreateDirectory(_uploadsRoot);
        }
    }

    public async Task<MediaUploadResponse> UploadAsync(
        IFormFile file,
        string category,
        Guid? entityId,
        string? entityType,
        string accessPolicy,
        Guid? userId,
        CancellationToken cancellationToken = default)
    {
        var safeCategory = string.IsNullOrWhiteSpace(category) ? "general" : Regex.Replace(category, @"[^a-zA-Z0-9_\-]", "").ToLowerInvariant();
        var targetDir = Path.Combine(_uploadsRoot, safeCategory);
        if (!Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        var assetId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var rawName = Path.GetFileNameWithoutExtension(file.FileName);
        var safeName = Regex.Replace(rawName, @"[^a-zA-Z0-9_\-]", "-").ToLowerInvariant();
        var storedFileName = $"{assetId}_{safeName}{ext}";
        var relativeStoragePath = Path.Combine("uploads", safeCategory, storedFileName).Replace("\\", "/");
        var physicalFullPath = Path.Combine(targetDir, storedFileName);

        await using (var stream = new FileStream(physicalFullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var normalizedPolicy = accessPolicy switch
        {
            "Public" => "Public",
            "AdminOnly" => "AdminOnly",
            _ => "Inherit"
        };

        var mediaAsset = new MediaAsset
        {
            Id = assetId,
            FileName = file.FileName,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            FileSizeBytes = file.Length,
            StorageRelativePath = relativeStoragePath,
            Category = safeCategory,
            AccessPolicy = normalizedPolicy,
            EntityId = entityId,
            EntityType = entityType,
            UploadedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.MediaAssets.Add(mediaAsset);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Uploaded media asset {AssetId} ({FileName}) to category {Category} with policy {Policy}",
            assetId, file.FileName, safeCategory, normalizedPolicy);

        return new MediaUploadResponse
        {
            Id = assetId,
            FileName = file.FileName,
            ContentType = mediaAsset.ContentType,
            FileSizeBytes = mediaAsset.FileSizeBytes,
            Url = $"/api/media/{assetId}",
            Category = safeCategory,
            AccessPolicy = normalizedPolicy,
            CreatedAt = mediaAsset.CreatedAt
        };
    }

    public async Task<MediaFileResult?> GetFileAsync(
        Guid id,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default)
    {
        var asset = await _dbContext.MediaAssets.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (asset == null)
        {
            return null;
        }

        var physicalPath = Path.Combine(_env.ContentRootPath, asset.StorageRelativePath);
        if (!File.Exists(physicalPath))
        {
            _logger.LogWarning("MediaAsset record {AssetId} exists in DB but file was not found at {Path}", id, physicalPath);
            return null;
        }

        var isAdmin = user?.Identity?.IsAuthenticated == true &&
                      (user.IsInRole("Admin") || user.IsInRole("SuperAdmin"));

        bool isAllowed;
        bool isPublic;

        switch (asset.AccessPolicy)
        {
            case "Public":
                isAllowed = true;
                isPublic = true;
                break;

            case "AdminOnly":
                isAllowed = isAdmin;
                isPublic = false;
                break;

            case "Inherit":
            default:
                if (asset.EntityType == "Project" && asset.EntityId.HasValue)
                {
                    var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == asset.EntityId.Value, cancellationToken);
                    if (project != null && project.IsPublished)
                    {
                        isAllowed = true;
                        isPublic = true;
                    }
                    else
                    {
                        isAllowed = isAdmin;
                        isPublic = false;
                    }
                }
                else if (asset.EntityType == "BlogPost" && asset.EntityId.HasValue)
                {
                    var post = await _dbContext.BlogPosts.FirstOrDefaultAsync(b => b.Id == asset.EntityId.Value, cancellationToken);
                    if (post != null && post.IsPublished)
                    {
                        isAllowed = true;
                        isPublic = true;
                    }
                    else
                    {
                        isAllowed = isAdmin;
                        isPublic = false;
                    }
                }
                else if (asset.Category == "cv" || asset.Category == "profile" || asset.Category == "general")
                {
                    // Profile avatars, hero photos, and public CVs default to accessible
                    isAllowed = true;
                    isPublic = true;
                }
                else
                {
                    isAllowed = isAdmin;
                    isPublic = false;
                }
                break;
        }

        if (!isAllowed)
        {
            return null;
        }

        return new MediaFileResult
        {
            PhysicalPath = physicalPath,
            ContentType = asset.ContentType,
            FileName = asset.FileName,
            IsPublic = isPublic
        };
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await _dbContext.MediaAssets.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (asset == null)
        {
            return false;
        }

        var physicalPath = Path.Combine(_env.ContentRootPath, asset.StorageRelativePath);
        if (File.Exists(physicalPath))
        {
            try
            {
                File.Delete(physicalPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete physical file {Path} for asset {AssetId}", physicalPath, id);
            }
        }

        _dbContext.MediaAssets.Remove(asset);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
