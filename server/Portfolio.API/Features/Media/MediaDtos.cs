namespace Portfolio.API.Features.Media;

/// <summary>
/// Multipart form for POST /api/media/upload. Grouping the file and its fields in one model
/// is what lets Swagger document the endpoint (it cannot mix IFormFile with loose form fields).
/// </summary>
public class MediaUploadRequest
{
    public IFormFile File { get; set; } = default!;
    public string? Category { get; set; } = "general";
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public string? AccessPolicy { get; set; } = "Inherit";
}

public class MediaUploadResponse
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string AccessPolicy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class MediaFileResult
{
    public string PhysicalPath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public bool IsPublic { get; set; }
}
