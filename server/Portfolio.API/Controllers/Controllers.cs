using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Portfolio.API.Data;
using Portfolio.API.Data.Entities;
using Portfolio.API.DTOs;
using Portfolio.API.Services;

namespace Portfolio.API.Controllers;

// ==========================================
// 1. Health & Status
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;
    private static readonly DateTime StartTime = DateTime.UtcNow;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var canConnect = await _context.Database.CanConnectAsync();
        sw.Stop();

        return Ok(new
        {
            status = canConnect ? "healthy" : "unhealthy",
            dbLatencyMs = sw.ElapsedMilliseconds,
            uptimeSeconds = (DateTime.UtcNow - StartTime).TotalSeconds,
            framework = ".NET 10 Web API",
            database = "PostgreSQL (Npgsql)",
            timestamp = DateTime.UtcNow
        });
    }
}

// ==========================================
// 2. Auth Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ISessionManager _sessionManager;
    private readonly IActivityLogger _activityLogger;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ISessionManager _sessionManager,
        IActivityLogger activityLogger,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        this._sessionManager = _sessionManager;
        _activityLogger = activityLogger;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return StatusCode(423, new { message = "Account is temporarily locked due to failed attempts. Try again later." });

        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid email or password." });

        // Generate JWT Token
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtSecret = _config["Jwt:Secret"] ?? "PortfolioSuperSecretKeyThatIsAtLeast32BytesLong!";
        var key = Encoding.UTF8.GetBytes(jwtSecret);
        var expires = DateTime.UtcNow.AddDays(7);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = expires,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        // Record User Session
        await _sessionManager.CreateSessionAsync(user.Id, tokenString, HttpContext);

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        await _activityLogger.LogAsync("USER_LOGIN", "User", user.Id.ToString(), $"User {user.Email} logged in.");

        return Ok(new LoginResponse
        {
            Token = tokenString,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = user.Role,
            ExpiresAt = expires
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return NotFound();

        return Ok(new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            FullName = user.FullName,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _activityLogger.LogAsync("USER_LOGOUT", "User", User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "", "User logged out.");
        return Ok(new { message = "Logged out successfully." });
    }
}

// ==========================================
// 3. Projects Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public ProjectsController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var projects = await _context.Projects
            .OrderBy(p => p.SortOrder)
            .Select(p => new ProjectDto
            {
                Id = p.Id,
                Slug = p.Slug,
                Title = p.Title,
                Tagline = p.Tagline,
                Description = p.Description,
                HeroImageUrl = p.HeroImageUrl,
                Tags = p.Tags,
                Screenshots = p.Screenshots,
                LiveUrl = p.LiveUrl,
                GithubUrl = p.GithubUrl,
                IsFeatured = p.IsFeatured,
                SortOrder = p.SortOrder,
                KeyMetricsJson = p.KeyMetricsJson,
                ContentMarkdown = p.ContentMarkdown,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var p = await _context.Projects.FirstOrDefaultAsync(x => x.Slug == slug);
        if (p == null) return NotFound();

        return Ok(new ProjectDto
        {
            Id = p.Id,
            Slug = p.Slug,
            Title = p.Title,
            Tagline = p.Tagline,
            Description = p.Description,
            HeroImageUrl = p.HeroImageUrl,
            Tags = p.Tags,
            Screenshots = p.Screenshots,
            LiveUrl = p.LiveUrl,
            GithubUrl = p.GithubUrl,
            IsFeatured = p.IsFeatured,
            SortOrder = p.SortOrder,
            KeyMetricsJson = p.KeyMetricsJson,
            ContentMarkdown = p.ContentMarkdown,
            UpdatedAt = p.UpdatedAt
        });
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProjectUpsertDto dto)
    {
        var project = new Project
        {
            Slug = dto.Slug.ToLowerInvariant().Trim(),
            Title = dto.Title,
            Tagline = dto.Tagline,
            Description = dto.Description,
            HeroImageUrl = dto.HeroImageUrl,
            Tags = dto.Tags,
            Screenshots = dto.Screenshots,
            LiveUrl = dto.LiveUrl,
            GithubUrl = dto.GithubUrl,
            IsFeatured = dto.IsFeatured,
            SortOrder = dto.SortOrder,
            KeyMetricsJson = dto.KeyMetricsJson,
            ContentMarkdown = dto.ContentMarkdown,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Projects.AddAsync(project);
        await _context.SaveChangesAsync();

        await _activityLogger.LogAsync("PROJECT_CREATE", "Project", project.Id.ToString(), $"Created project '{project.Title}'");
        return CreatedAtAction(nameof(GetBySlug), new { slug = project.Slug }, project);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProjectUpsertDto dto)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null) return NotFound();

        project.Slug = dto.Slug.ToLowerInvariant().Trim();
        project.Title = dto.Title;
        project.Tagline = dto.Tagline;
        project.Description = dto.Description;
        project.HeroImageUrl = dto.HeroImageUrl;
        project.Tags = dto.Tags;
        project.Screenshots = dto.Screenshots;
        project.LiveUrl = dto.LiveUrl;
        project.GithubUrl = dto.GithubUrl;
        project.IsFeatured = dto.IsFeatured;
        project.SortOrder = dto.SortOrder;
        project.KeyMetricsJson = dto.KeyMetricsJson;
        project.ContentMarkdown = dto.ContentMarkdown;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("PROJECT_UPDATE", "Project", project.Id.ToString(), $"Updated project '{project.Title}'");

        return Ok(project);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null) return NotFound();

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("PROJECT_DELETE", "Project", id.ToString(), $"Deleted project '{project.Title}'");

        return NoContent();
    }
}

// ==========================================
// 4. Experience Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class ExperienceController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public ExperienceController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _context.Experiences
            .OrderBy(e => e.SortOrder)
            .Select(e => new ExperienceDto
            {
                Id = e.Id,
                Role = e.Role,
                Company = e.Company,
                Location = e.Location,
                Period = e.Period,
                Achievements = e.Achievements,
                SortOrder = e.SortOrder
            })
            .ToListAsync();

        return Ok(items);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ExperienceUpsertDto dto)
    {
        var exp = new Experience
        {
            Role = dto.Role,
            Company = dto.Company,
            Location = dto.Location,
            Period = dto.Period,
            Achievements = dto.Achievements,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Experiences.AddAsync(exp);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("EXPERIENCE_CREATE", "Experience", exp.Id.ToString(), $"Added experience '{exp.Role}' at '{exp.Company}'");

        return Ok(exp);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ExperienceUpsertDto dto)
    {
        var exp = await _context.Experiences.FindAsync(id);
        if (exp == null) return NotFound();

        exp.Role = dto.Role;
        exp.Company = dto.Company;
        exp.Location = dto.Location;
        exp.Period = dto.Period;
        exp.Achievements = dto.Achievements;
        exp.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("EXPERIENCE_UPDATE", "Experience", exp.Id.ToString(), $"Updated experience '{exp.Role}' at '{exp.Company}'");

        return Ok(exp);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var exp = await _context.Experiences.FindAsync(id);
        if (exp == null) return NotFound();

        _context.Experiences.Remove(exp);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("EXPERIENCE_DELETE", "Experience", id.ToString(), $"Deleted experience at '{exp.Company}'");

        return NoContent();
    }
}

// ==========================================
// 5. Blog Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class BlogController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public BlogController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeUnpublished = false)
    {
        var query = _context.BlogPosts.AsQueryable();
        if (!includeUnpublished) query = query.Where(p => p.IsPublished);

        var posts = await query
            .OrderByDescending(p => p.PublishedAt ?? p.CreatedAt)
            .Select(p => new BlogPostDto
            {
                Id = p.Id,
                Slug = p.Slug,
                Title = p.Title,
                Excerpt = p.Excerpt,
                ContentMarkdown = p.ContentMarkdown,
                CoverImageUrl = p.CoverImageUrl,
                Tags = p.Tags,
                IsPublished = p.IsPublished,
                PublishedAt = p.PublishedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync();

        return Ok(posts);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var p = await _context.BlogPosts.FirstOrDefaultAsync(x => x.Slug == slug);
        if (p == null) return NotFound();

        return Ok(new BlogPostDto
        {
            Id = p.Id,
            Slug = p.Slug,
            Title = p.Title,
            Excerpt = p.Excerpt,
            ContentMarkdown = p.ContentMarkdown,
            CoverImageUrl = p.CoverImageUrl,
            Tags = p.Tags,
            IsPublished = p.IsPublished,
            PublishedAt = p.PublishedAt,
            UpdatedAt = p.UpdatedAt
        });
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BlogPostUpsertDto dto)
    {
        var post = new BlogPost
        {
            Slug = dto.Slug.ToLowerInvariant().Trim(),
            Title = dto.Title,
            Excerpt = dto.Excerpt,
            ContentMarkdown = dto.ContentMarkdown,
            CoverImageUrl = dto.CoverImageUrl,
            Tags = dto.Tags,
            IsPublished = dto.IsPublished,
            PublishedAt = dto.IsPublished ? (dto.PublishedAt ?? DateTime.UtcNow) : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.BlogPosts.AddAsync(post);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("BLOG_CREATE", "BlogPost", post.Id.ToString(), $"Created blog post '{post.Title}'");

        return CreatedAtAction(nameof(GetBySlug), new { slug = post.Slug }, post);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] BlogPostUpsertDto dto)
    {
        var post = await _context.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();

        post.Slug = dto.Slug.ToLowerInvariant().Trim();
        post.Title = dto.Title;
        post.Excerpt = dto.Excerpt;
        post.ContentMarkdown = dto.ContentMarkdown;
        post.CoverImageUrl = dto.CoverImageUrl;
        post.Tags = dto.Tags;
        post.IsPublished = dto.IsPublished;
        if (dto.IsPublished && post.PublishedAt == null) post.PublishedAt = DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("BLOG_UPDATE", "BlogPost", post.Id.ToString(), $"Updated blog post '{post.Title}'");

        return Ok(post);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var post = await _context.BlogPosts.FindAsync(id);
        if (post == null) return NotFound();

        _context.BlogPosts.Remove(post);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("BLOG_DELETE", "BlogPost", id.ToString(), $"Deleted blog post '{post.Title}'");

        return NoContent();
    }
}

// ==========================================
// 6. Skills Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class SkillsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public SkillsController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var skills = await _context.Skills
            .OrderBy(s => s.SortOrder)
            .Select(s => new SkillDto
            {
                Id = s.Id,
                Category = s.Category,
                Name = s.Name,
                IconName = s.IconName,
                SortOrder = s.SortOrder
            })
            .ToListAsync();

        return Ok(skills);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SkillUpsertDto dto)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null) return NotFound();

        skill.Category = dto.Category;
        skill.Name = dto.Name;
        skill.IconName = dto.IconName;
        skill.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("SKILL_UPDATE", "Skill", skill.Id.ToString(), $"Updated skill '{skill.Name}'");

        return Ok(skill);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SkillUpsertDto dto)
    {
        var skill = new Skill
        {
            Category = dto.Category,
            Name = dto.Name,
            IconName = dto.IconName,
            SortOrder = dto.SortOrder
        };

        await _context.Skills.AddAsync(skill);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("SKILL_CREATE", "Skill", skill.Id.ToString(), $"Added skill '{skill.Name}'");

        return Ok(skill);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null) return NotFound();

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("SKILL_DELETE", "Skill", id.ToString(), $"Deleted skill '{skill.Name}'");

        return NoContent();
    }
}

// ==========================================
// 7. Site Settings Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public SettingsController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _context.SiteSettings
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        return Ok(settings);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("{key}")]
    public async Task<IActionResult> UpdateSetting(string key, [FromBody] SiteSettingUpdateDto dto)
    {
        var setting = await _context.SiteSettings.FindAsync(key);
        if (setting == null)
        {
            setting = new SiteSetting { Key = key, Value = dto.Value, UpdatedAt = DateTime.UtcNow };
            await _context.SiteSettings.AddAsync(setting);
        }
        else
        {
            setting.Value = dto.Value;
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("SETTING_UPDATE", "SiteSetting", key, $"Updated site setting '{key}'");

        return Ok(setting);
    }
}

// ==========================================
// 8. Contact & Inquiries Controller
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IActivityLogger _activityLogger;

    public ContactController(AppDbContext context, IActivityLogger activityLogger)
    {
        _context = context;
        _activityLogger = activityLogger;
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ContactRequestDto dto)
    {
        var inquiry = new ContactInquiry
        {
            Name = dto.Name,
            Email = dto.Email,
            Subject = dto.Subject,
            Message = dto.Message,
            Status = "unread",
            CreatedAt = DateTime.UtcNow
        };

        await _context.ContactInquiries.AddAsync(inquiry);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Inquiry received successfully." });
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpGet("inquiries")]
    public async Task<IActionResult> GetInquiries()
    {
        var inquiries = await _context.ContactInquiries
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new ContactInquiryDto
            {
                Id = i.Id,
                Name = i.Name,
                Email = i.Email,
                Subject = i.Subject,
                Message = i.Message,
                Status = i.Status,
                CreatedAt = i.CreatedAt
            })
            .ToListAsync();

        return Ok(inquiries);
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPut("inquiries/{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status)
    {
        var inquiry = await _context.ContactInquiries.FindAsync(id);
        if (inquiry == null) return NotFound();

        inquiry.Status = status;
        await _context.SaveChangesAsync();
        await _activityLogger.LogAsync("INQUIRY_STATUS", "ContactInquiry", id.ToString(), $"Updated inquiry status to '{status}'");

        return Ok(inquiry);
    }
}

// ==========================================
// 9. Media & Uploads (Cloudflare R2)
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly IStorageService _storageService;

    public MediaController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpPost("presign")]
    public IActionResult GetPresignedUrl([FromBody] PresignedUrlRequest request)
    {
        var response = _storageService.GeneratePresignedUploadUrl(request);
        return Ok(response);
    }
}

// ==========================================
// 10. Telemetry & Visitor Analytics
// ==========================================

[ApiController]
[Route("api/[controller]")]
public class TelemetryController : ControllerBase
{
    private readonly AppDbContext _context;

    public TelemetryController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("visit")]
    public async Task<IActionResult> TrackVisit([FromBody] VisitorPingDto dto)
    {
        var country = Request.Headers["CF-IPCountry"].ToString();
        var city = Request.Headers["CF-IPCity"].ToString();
        var ua = Request.Headers["User-Agent"].ToString();

        var analytic = new VisitorAnalytic
        {
            Path = dto.Path.Length > 255 ? dto.Path[..255] : dto.Path,
            Referrer = (dto.Referrer ?? "").Length > 255 ? (dto.Referrer ?? "")[..255] : (dto.Referrer ?? ""),
            CountryCode = string.IsNullOrEmpty(country) ? "GLOBAL" : country,
            City = city,
            DeviceType = ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ? "Mobile" : "Desktop",
            Browser = ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase) ? "Chrome" : "Other",
            Timestamp = DateTime.UtcNow
        };

        await _context.VisitorAnalytics.AddAsync(analytic);
        await _context.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("cv-download")]
    public async Task<IActionResult> TrackCvDownload([FromBody] CvDownloadPingDto dto)
    {
        var country = Request.Headers["CF-IPCountry"].ToString();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var cv = new CvDownload
        {
            Referrer = (dto.Referrer ?? "").Length > 255 ? (dto.Referrer ?? "")[..255] : (dto.Referrer ?? ""),
            CountryCode = string.IsNullOrEmpty(country) ? "GLOBAL" : country,
            IpAddress = ip,
            Timestamp = DateTime.UtcNow
        };

        await _context.CvDownloads.AddAsync(cv);
        await _context.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [Authorize(Roles = "SuperAdmin,Editor")]
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalViews = await _context.VisitorAnalytics.CountAsync();
        var totalCv = await _context.CvDownloads.CountAsync();
        var totalInquiries = await _context.ContactInquiries.CountAsync();
        var activeSessions = await _context.UserSessions.CountAsync(s => !s.IsRevoked && (DateTime.UtcNow - s.LastActiveAt).TotalMinutes < 5);

        var topProjects = await _context.VisitorAnalytics
            .Where(v => v.Path.StartsWith("/projects/"))
            .GroupBy(v => v.Path.Replace("/projects/", ""))
            .Select(g => new TopProjectDto { Slug = g.Key, Views = g.Count() })
            .OrderByDescending(x => x.Views)
            .Take(5)
            .ToListAsync();

        var topReferrers = await _context.VisitorAnalytics
            .Where(v => !string.IsNullOrEmpty(v.Referrer))
            .GroupBy(v => v.Referrer)
            .Select(g => new ReferrerCountDto { Referrer = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        var topCountries = await _context.VisitorAnalytics
            .GroupBy(v => v.CountryCode)
            .Select(g => new CountryCountDto { CountryCode = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync();

        return Ok(new AnalyticsSummaryDto
        {
            TotalPageViews = totalViews,
            TotalCvDownloads = totalCv,
            TotalInquiries = totalInquiries,
            ActiveSessionsCount = activeSessions,
            TopProjects = topProjects,
            TopReferrers = topReferrers,
            TopCountries = topCountries
        });
    }
}

// ==========================================
// 11. Admin & Governance (Sessions, Logs)
// ==========================================

[Authorize(Roles = "SuperAdmin,Editor")]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionManager _sessionManager;
    private readonly IActivityLogger _activityLogger;

    public AdminController(AppDbContext context, ISessionManager sessionManager, IActivityLogger activityLogger)
    {
        _context = context;
        _sessionManager = sessionManager;
        _activityLogger = activityLogger;
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var sessions = await _sessionManager.GetActiveSessionsAsync();
        return Ok(sessions);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("sessions/{id}")]
    public async Task<IActionResult> RevokeSession(Guid id)
    {
        await _sessionManager.RevokeSessionAsync(id);
        await _activityLogger.LogAsync("SESSION_REVOKED", "UserSession", id.ToString(), $"Revoked user session {id}");
        return Ok(new { message = "Session revoked." });
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivityLogs([FromQuery] int take = 50)
    {
        var logs = await _context.ActivityLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(take)
            .Select(a => new ActivityLogDto
            {
                Id = a.Id,
                UserEmail = a.UserEmail,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Summary = a.Summary,
                DetailsJson = a.DetailsJson,
                IpAddress = a.IpAddress,
                DeviceInfo = a.DeviceInfo,
                Timestamp = a.Timestamp
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpGet("system-logs")]
    public async Task<IActionResult> GetSystemLogs([FromQuery] int take = 50, [FromQuery] string? level = null)
    {
        var query = _context.SystemLogs.AsQueryable();
        if (!string.IsNullOrEmpty(level)) query = query.Where(l => l.Level == level);

        var logs = await query
            .OrderByDescending(l => l.Timestamp)
            .Take(take)
            .Select(l => new SystemLogDto
            {
                Id = l.Id,
                Level = l.Level,
                Message = l.Message,
                Exception = l.Exception,
                StackTrace = l.StackTrace,
                Path = l.Path,
                HttpMethod = l.HttpMethod,
                StatusCode = l.StatusCode,
                IpAddress = l.IpAddress,
                Timestamp = l.Timestamp
            })
            .ToListAsync();

        return Ok(logs);
    }
}
