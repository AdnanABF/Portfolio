using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Infrastructure.Email;

namespace Portfolio.API.IntegrationTests;

/// <summary>Keeps every email the API sends, so tests can read the links inside them.</summary>
public sealed class CapturingEmailSender : IEmailSender
{
    public System.Collections.Concurrent.ConcurrentQueue<EmailMessage> Sent { get; } = new();

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        Sent.Enqueue(message);
        return Task.CompletedTask;
    }
}

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string AdminEmail = "test_admin@example.com";
    public const string AdminPassword = "AdminPassword123!";
    public const string RegularUserEmail = "test_regular@example.com";
    public const string RegularUserPassword = "UserPassword123!";

    /// <summary>An Admin who is not the SuperAdmin: may use the admin area but not the members panel.</summary>
    public const string AdminOnlyEmail = "test_adminonly@example.com";
    public const string AdminOnlyPassword = "AdminOnly123!";

    /// <summary>Test members use this domain so cleanup can find them.</summary>
    public const string MemberEmailDomain = "@members.test";

    public CapturingEmailSender Emails => Services.GetRequiredService<CapturingEmailSender>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // Program startup seeds the admin via DbInitializer, which throws without credentials.
        // Supply the same test admin used by ConfigureServices below.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = AdminEmail,
                ["Admin:Password"] = AdminPassword
            });
        });

        var testConnectionString = Environment.GetEnvironmentVariable("TEST_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=portfolio_test;Username=postgres;Password=postgres";

        builder.ConfigureServices(services =>
        {
            // Emails are captured, never sent.
            var capturing = new CapturingEmailSender();
            services.AddSingleton(capturing);
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(capturing);

            // Remove existing AppDbContext and DbContextOptions registrations
            var optionsDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (optionsDescriptor != null) services.Remove(optionsDescriptor);

            var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(AppDbContext));
            if (contextDescriptor != null) services.Remove(contextDescriptor);

            // Register AppDbContext with the dedicated test database
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseNpgsql(testConnectionString);
            });

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var scopedServices = scope.ServiceProvider;
            var db = scopedServices.GetRequiredService<AppDbContext>();
            var userManager = scopedServices.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scopedServices.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

            // Ensure test database is migrated
            db.Database.Migrate();

            // Ensure roles
            foreach (var role in UserRoles.All)
            {
                if (!roleManager.RoleExistsAsync(role).GetAwaiter().GetResult())
                {
                    roleManager.CreateAsync(new IdentityRole<Guid> { Name = role }).GetAwaiter().GetResult();
                }
            }

            // Ensure clean test Admin user
            var admin = userManager.FindByEmailAsync(AdminEmail).GetAwaiter().GetResult();
            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    UserName = AdminEmail,
                    Email = AdminEmail,
                    FullName = "Test Admin",
                    Role = UserRoles.SuperAdmin,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };
                userManager.CreateAsync(admin, AdminPassword).GetAwaiter().GetResult();
                userManager.AddToRolesAsync(admin, ["Admin", "SuperAdmin"]).GetAwaiter().GetResult();
            }

            // Ensure clean test Regular Non-Admin user
            var reg = userManager.FindByEmailAsync(RegularUserEmail).GetAwaiter().GetResult();
            if (reg == null)
            {
                reg = new ApplicationUser
                {
                    UserName = RegularUserEmail,
                    Email = RegularUserEmail,
                    FullName = "Regular Visitor",
                    Role = UserRoles.Member,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };
                userManager.CreateAsync(reg, RegularUserPassword).GetAwaiter().GetResult();
                userManager.AddToRoleAsync(reg, UserRoles.Member).GetAwaiter().GetResult();
            }

            // Ensure a test Admin who is not the SuperAdmin
            var adminOnly = userManager.FindByEmailAsync(AdminOnlyEmail).GetAwaiter().GetResult();
            if (adminOnly == null)
            {
                adminOnly = new ApplicationUser
                {
                    UserName = AdminOnlyEmail,
                    Email = AdminOnlyEmail,
                    FullName = "Test Admin Only",
                    Role = UserRoles.Admin,
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };
                userManager.CreateAsync(adminOnly, AdminOnlyPassword).GetAwaiter().GetResult();
                userManager.AddToRoleAsync(adminOnly, UserRoles.Admin).GetAwaiter().GetResult();
            }
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try
            {
                using var scope = Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.UserSessions.Where(s => s.User!.Email == AdminEmail || s.User!.Email == RegularUserEmail || s.User!.Email == AdminOnlyEmail
                    || s.User!.Email!.EndsWith(MemberEmailDomain)).ExecuteDelete();
                db.Users.Where(u => u.Email == AdminEmail || u.Email == RegularUserEmail || u.Email == AdminOnlyEmail
                    || u.Email!.EndsWith(MemberEmailDomain)).ExecuteDelete();
            }
            catch
            {
                // Ignore cleanup errors on disposal
            }
        }
        base.Dispose(disposing);
    }
}
