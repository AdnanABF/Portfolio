namespace Portfolio.API.Features.Media;

public class PresignedUrlRequest
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Folder { get; set; } = "general"; // "projects", "blog", "cv", "profile"
}

public class PresignedUrlResponse
{
    public string UploadUrl { get; set; } = string.Empty;
    public string PublicUrl { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
}
