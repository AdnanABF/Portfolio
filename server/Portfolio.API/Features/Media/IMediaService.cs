namespace Portfolio.API.Features.Media;

public interface IMediaService
{
    PresignedUrlResponse GeneratePresignedUploadUrl(PresignedUrlRequest request);
}
