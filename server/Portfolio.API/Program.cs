using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Portfolio.API.Data;
using Portfolio.API.Data.Entities;
using Portfolio.API.Middlewares;
using Portfolio.API.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Setup
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// 2. Database Connection (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=portfolio_dev;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// 3. Identity Configuration
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

// 4. JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "PortfolioSuperSecretKeyThatIsAtLeast32BytesLong!";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 5. CORS Policies
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

// 6. Application Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IStorageService, CloudflareR2StorageService>();
builder.Services.AddScoped<IActivityLogger, ActivityLogger>();
builder.Services.AddScoped<ISessionManager, SessionManager>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 7. Swagger with JWT Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Adnan Bin Farook Portfolio API",
        Version = "v1",
        Description = "Enterprise .NET 10 API powering dynamic CMS, in-context live editing, and telemetry."
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.ParameterLocation.Header,
        Type = Microsoft.OpenApi.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(document => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document)] = new List<string>()
    });
});

var app = builder.Build();

// 8. Auto-Migration & Seeding on Startup
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

// 9. Pipeline Configuration
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger", true))
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

app.UseAuthentication();
app.UseMiddleware<SessionTrackingMiddleware>();
app.UseAuthorization();

app.MapControllers();

app.Run();
