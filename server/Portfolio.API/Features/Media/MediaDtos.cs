namespace Portfolio.API.Features.Media;

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
