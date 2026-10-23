using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Features.Media;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly IValidator<PresignedUrlRequest> _validator;

    public MediaController(IMediaService mediaService, IValidator<PresignedUrlRequest> validator)
    {
        _mediaService = mediaService;
        _validator = validator;
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("presign")]
    public async Task<ActionResult<PresignedUrlResponse>> GetPresignedUrl(
        [FromBody] PresignedUrlRequest request, 
        CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        var response = _mediaService.GeneratePresignedUploadUrl(request);
        return Ok(response);
    }
}
