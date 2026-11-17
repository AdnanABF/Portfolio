using System.Security.Claims;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Admin;
using Portfolio.API.Features.Auth;
using Portfolio.API.Features.Blog;
using Portfolio.API.Features.Contact;
using Portfolio.API.Features.Experience;
using Portfolio.API.Features.Health;
using Portfolio.API.Features.Media;
using Portfolio.API.Features.Projects;
using Portfolio.API.Features.Settings;
using Portfolio.API.Features.Skills;
using Portfolio.API.Features.Telemetry;
using Portfolio.API.Features.Credentials;
using Portfolio.API.Features.Homepage;
using Portfolio.API.Features.Users;
using Portfolio.API.Infrastructure.Caching;
using Portfolio.API.Infrastructure.Email;
using Portfolio.API.Infrastructure.ExceptionHandling;
using Portfolio.API.Infrastructure.Extensions;
using Portfolio.API.Infrastructure.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Logging
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// 2. Forwarded Headers (Trusts reverse proxy only)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    // Configurable number of proxy hops (e.g. Reverse Proxy + Next.js rewrite / CDN)
    options.ForwardLimit = builder.Configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 2;

    var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
    if (knownProxies != null && knownProxies.Length > 0)
    {
        options.KnownProxies.Clear();
        foreach (var proxy in knownProxies)
        {
            if (System.Net.IPAddress.TryParse(proxy, out var ip))
                options.KnownProxies.Add(ip);
        }
    }

    var knownNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>();
    if (knownNetworks != null && knownNetworks.Length > 0)
    {
        options.KnownIPNetworks.Clear();
        foreach (var network in knownNetworks)
        {
            var parts = network.Split('/');
            if (parts.Length == 2 && System.Net.IPAddress.TryParse(parts[0], out var prefix) && int.TryParse(parts[1], out var prefixLength))
                options.KnownIPNetworks.Add(new System.Net.IPNetwork(prefix, prefixLength));
        }
    }
});

// 3. Database Connection (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=portfolio_dev;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// 4. Data Protection Keys in PostgreSQL
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<AppDbContext>()
    .SetApplicationName("PortfolioApp");

// 5. Identity Configuration
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// Identity re-checks the user's security stamp now and then (every 30 minutes by default) and replaces the signed-in
// principal with a fresh one. A fresh principal has no "sid" (our session id), so carry it over. Without this the
// session check below rejects the session at that moment and signs the user out about 30 minutes after sign-in.
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
    options.OnRefreshingPrincipal = context =>
    {
        var sid = context.CurrentPrincipal?.FindFirst("sid");
        if (sid != null && context.NewPrincipal?.Identity is System.Security.Claims.ClaimsIdentity identity && !identity.HasClaim("sid", sid.Value))
        {
            identity.AddClaim(new System.Security.Claims.Claim("sid", sid.Value));
        }
        return Task.CompletedTask;
    });

// Invite, verification and password-reset links stay valid for three days.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
    options.TokenLifespan = TimeSpan.FromDays(3));

// 6. Identity Application Cookie
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.Name = builder.Environment.IsDevelopment()
        ? "portfolio_session"
        : "__Host-portfolio_session";
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromDays(14);

    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
    options.Events.OnValidatePrincipal = async context =>
    {
        // 1. Run Identity's built-in security stamp check
        await SecurityStampValidator.ValidatePrincipalAsync(context);
        if (context.Principal == null)
        {
            return;
        }

        // 2. Read sid claim
        var sidClaim = context.Principal.FindFirst("sid")?.Value;
        if (!Guid.TryParse(sidClaim, out var sessionId))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync();
            return;
        }

        // 3. Load session row by primary key
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var session = await db.UserSessions.FindAsync(sessionId);
        if (session == null || session.IsRevoked || session.ExpiresAt < DateTime.UtcNow)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync();
            return;
        }

        // 4. Update LastActiveAt and extend ExpiresAt if older than 5 minutes
        if (DateTime.UtcNow - session.LastActiveAt > TimeSpan.FromMinutes(5))
        {
            session.LastActiveAt = DateTime.UtcNow;
            session.ExpiresAt = DateTime.UtcNow.AddDays(14);
            await db.SaveChangesAsync();
        }
    };
});

// 7. Authorization (AdminOnly Policy & Fallback)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(UserRoles.SuperAdmin, UserRoles.Admin));
    // Only the owner account manages members.
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole(UserRoles.SuperAdmin));
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireRole("SuperAdmin", "Admin").Build();
});

// 8. Built-in Rate Limiting
// The sign-in and account limits can be raised in configuration (read per request, so test hosts can override
// them) so integration tests can sign in many times from one address. Production keeps the defaults.
static int PermitLimit(HttpContext httpContext, string key, int fallback) =>
    httpContext.RequestServices.GetRequiredService<IConfiguration>().GetValue(key, fallback);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = PermitLimit(httpContext, "RateLimiting:AuthPermitLimit", 5),
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    // Public account endpoints (sign-up, verification, password reset): stricter than login would be too noisy.
    options.AddPolicy("account-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = PermitLimit(httpContext, "RateLimiting:AccountPermitLimit", 10),
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    // Endpoints that act on an emailed token or a password: more room than the "send me an email" ones above,
    // so a busy shared address does not lock people out of finishing a reset they already have the link for.
    options.AddPolicy("account-token-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = PermitLimit(httpContext, "RateLimiting:AccountTokenPermitLimit", 30),
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));

    options.AddPolicy("contact-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("access-request-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0
            }));

    options.AddPolicy("telemetry-rate-limit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.GetClientIpAddress(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// 9. CORS Policies (Tightened to known origins)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[]
{
    "http://localhost:3000",
    "https://staging.adnanbinfarook.com",
    "https://adnanbinfarook.com"
};

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowPortfolio", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 10. ProblemDetails & Global Exception Handling
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// 11. Output Caching (In-Memory with Tag Eviction)
builder.Services.AddOutputCache(options =>
{
    options.DefaultExpirationTimeSpan = TimeSpan.FromMinutes(10);

    // Draft-aware content: cached for anonymous visitors only. Signed-in (admin) requests
    // bypass the cache so draft responses can never be served to the public.
    options.AddPolicy("projects", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("projects"));
    options.AddPolicy("blog", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("blog"));
    options.AddPolicy("skills", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("skills"));
    options.AddPolicy("experience", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("experience"));
    options.AddPolicy("education", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("education"));
    options.AddPolicy("certifications", b => b.AddPolicy<PublicOnlyCachePolicy>().Tag("certifications"));
});

// 12. FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// 12b. Email sending (Resend). Outside Development the Resend settings are required.
// Invite, verification and reset links are built from this address. Outside Development a missing value would
// make every link point at localhost, so the app refuses to start without it.
if (!builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(builder.Configuration["App:PublicBaseUrl"]))
{
    throw new InvalidOperationException(
        "App:PublicBaseUrl is missing. Set it to the public address of the website, for example https://yourdomain.com " +
        "(environment variable App__PublicBaseUrl).");
}

builder.Services.AddMemoryCache();
builder.Services.AddEmailSending(builder.Configuration, builder.Environment);

// 13. Application & Feature Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();
builder.Services.AddScoped<ISessionManager, SessionManager>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IExperienceService, ExperienceService>();
builder.Services.AddScoped<ISkillsService, SkillsService>();
builder.Services.AddScoped<IBlogService, BlogService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<ICredentialsService, CredentialsService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IUserAdminService, UserAdminService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IContactService, ContactService>();
builder.Services.AddScoped<ITelemetryService, TelemetryService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IHealthService, HealthService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 14. Swagger Documentation
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Adnan Bin Farook Portfolio API",
        Version = "v1",
        Description = "ASP.NET Core Web API powering dynamic CMS, live editing, and telemetry."
    });
});

var app = builder.Build();

// 15. Auto-Migration & Seeding on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var dbContext = services.GetRequiredService<AppDbContext>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

    logger.LogInformation("Checking database migrations and seeding initial data...");
    await DbInitializer.SeedAsync(dbContext, userManager, roleManager, app.Configuration, logger);
}

// 16. Middleware Pipeline
app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger", false))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Portfolio API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseSerilogRequestLogging();
app.UseCors("AllowPortfolio");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.UseOutputCache();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow })).AllowAnonymous();
app.MapControllers();

app.Run();

public partial class Program { }
