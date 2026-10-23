using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.IntegrationTests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string AdminEmail = "test_admin@example.com";
    public const string AdminPassword = "AdminPassword123!";
    public const string RegularUserEmail = "test_regular@example.com";
    public const string RegularUserPassword = "UserPassword123!";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        var testConnectionString = Environment.GetEnvironmentVariable("TEST_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=portfolio_test;Username=postgres;Password=banana@7199";

        builder.ConfigureServices(services =>
        {
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
            string[] roles = ["SuperAdmin", "Admin", "Viewer"];
            foreach (var role in roles)
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
                    Role = "Admin",
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
                    Role = "Viewer",
                    EmailConfirmed = true,
                    CreatedAt = DateTime.UtcNow
                };
                userManager.CreateAsync(reg, RegularUserPassword).GetAwaiter().GetResult();
                userManager.AddToRoleAsync(reg, "Viewer").GetAwaiter().GetResult();
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
                db.UserSessions.Where(s => s.User!.Email == AdminEmail || s.User!.Email == RegularUserEmail).ExecuteDelete();
                db.Users.Where(u => u.Email == AdminEmail || u.Email == RegularUserEmail).ExecuteDelete();
            }
            catch
            {
                // Ignore cleanup errors on disposal
            }
        }
        base.Dispose(disposing);
    }
}
