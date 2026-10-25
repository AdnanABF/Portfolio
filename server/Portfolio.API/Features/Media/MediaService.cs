using Amazon.S3;
using Amazon.S3.Model;

namespace Portfolio.API.Features.Media;

public class MediaService : IMediaService
{
    private readonly IConfiguration _config;
    private readonly ILogger<MediaService> _logger;

    public MediaService(IConfiguration config, ILogger<MediaService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public PresignedUrlResponse GeneratePresignedUploadUrl(PresignedUrlRequest request)
    {
        var accountId = _config["R2:AccountId"] ?? _config["Storage:AccountId"] ?? "";
        var accessKeyId = _config["R2:AccessKeyId"] ?? _config["Storage:AccessKeyId"] ?? "";
        var secretAccessKey = _config["R2:SecretAccessKey"] ?? _config["Storage:SecretAccessKey"] ?? "";
        var bucketName = _config["R2:BucketName"] ?? _config["Storage:BucketName"] ?? "portfolio-media";
        var publicBaseUrl = _config["R2:PublicUrl"] ?? _config["Storage:PublicDomain"] ?? "https://media.adnanbinfarook.com";

        var ext = Path.GetExtension(request.FileName);
        var baseName = Path.GetFileNameWithoutExtension(request.FileName)
            .Replace(" ", "-")
            .ToLowerInvariant();
        var key = $"{request.Folder}/{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{baseName}{ext}";

        if (string.IsNullOrEmpty(accessKeyId) || string.IsNullOrEmpty(secretAccessKey) || string.IsNullOrEmpty(accountId))
        {
            _logger.LogWarning("Cloudflare R2 credentials not fully configured; generating placeholder upload response.");
            return new PresignedUrlResponse
            {
                UploadUrl = $"/api/media/placeholder-upload?key={key}",
                PublicUrl = $"{publicBaseUrl}/{key}",
                Key = key
            };
        }

        var s3ClientConfig = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com"
        };

        using var client = new AmazonS3Client(accessKeyId, secretAccessKey, s3ClientConfig);

        var presignRequest = new GetPreSignedUrlRequest
        {
            BucketName = bucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(15),
            ContentType = request.ContentType
        };

        var uploadUrl = client.GetPreSignedURL(presignRequest);
        var publicUrl = $"{publicBaseUrl.TrimEnd('/')}/{key}";

        return new PresignedUrlResponse
        {
            UploadUrl = uploadUrl,
            PublicUrl = publicUrl,
            Key = key
        };
    }
}
