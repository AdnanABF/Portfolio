using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Portfolio.API.Features.Media;

public interface IMediaService
{
    Task<MediaUploadResponse> UploadAsync(
        IFormFile file,
        string category,
        Guid? entityId,
        string? entityType,
        string accessPolicy,
        Guid? userId,
        CancellationToken cancellationToken = default);

    Task<MediaFileResult?> GetFileAsync(
        Guid id,
        ClaimsPrincipal? user,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
