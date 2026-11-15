using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Portfolio.API.Infrastructure.Extensions;

namespace Portfolio.API.Features.Homepage;

/// <summary>The published home page content, for everyone.</summary>
[ApiController]
[Route("api/site-content")]
public class SiteContentController : ControllerBase
{
    private readonly ISiteContentService _service;

    public SiteContentController(ISiteContentService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [HttpGet]
    [OutputCache(Tags = [SiteContentService.CacheTag])]
    public async Task<ActionResult<HomepageContent>> GetPublished(CancellationToken cancellationToken)
    {
        return await this.UnlessClientHungUp<HomepageContent>(async () =>
            Ok(await _service.GetPublishedAsync(cancellationToken)), cancellationToken);
    }
}

/// <summary>Editing the home page: a draft that is previewed and saved, then published.</summary>
[ApiController]
[Route("api/admin/site-content")]
[Authorize(Policy = "AdminOnly")]
public class AdminSiteContentController : ControllerBase
{
    private readonly ISiteContentService _service;
    private readonly IValidator<HomepageContent> _validator;

    public AdminSiteContentController(ISiteContentService service, IValidator<HomepageContent> validator)
    {
        _service = service;
        _validator = validator;
    }

    private string? Actor => User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;

    [HttpGet]
    public async Task<ActionResult<SiteContentAdminDto>> Get(CancellationToken cancellationToken)
    {
        return await this.UnlessClientHungUp<SiteContentAdminDto>(async () =>
            Ok(await _service.GetAdminAsync(cancellationToken)), cancellationToken);
    }

    [HttpPut]
    public async Task<ActionResult<SiteContentAdminDto>> SaveDraft([FromBody] HomepageContent content, CancellationToken cancellationToken)
    {
        var validation = await _validator.ValidateAsync(content, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(validation.ToDictionary());
        }

        return Ok(await _service.SaveDraftAsync(content, Actor, cancellationToken));
    }

    [HttpPost("publish")]
    public async Task<ActionResult<SiteContentAdminDto>> Publish(CancellationToken cancellationToken)
    {
        return Ok(await _service.PublishAsync(Actor, cancellationToken));
    }

    [HttpPost("discard")]
    public async Task<ActionResult<SiteContentAdminDto>> Discard(CancellationToken cancellationToken)
    {
        return Ok(await _service.DiscardDraftAsync(Actor, cancellationToken));
    }
}
