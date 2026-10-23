using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Core.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IDataProtectionKeyContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<SystemLog> SystemLogs => Set<SystemLog>();
    public DbSet<VisitorAnalytic> VisitorAnalytics => Set<VisitorAnalytic>();
    public DbSet<CvDownload> CvDownloads => Set<CvDownload>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<Experience> Experiences => Set<Experience>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<ContactInquiry> ContactInquiries => Set<ContactInquiry>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Rename Identity tables for clean Postgres naming
        builder.Entity<ApplicationUser>(b => b.ToTable("Users"));
        builder.Entity<IdentityRole<Guid>>(b => b.ToTable("Roles"));
        builder.Entity<IdentityUserRole<Guid>>(b => b.ToTable("UserRoles"));
        builder.Entity<IdentityUserClaim<Guid>>(b => b.ToTable("UserClaims"));
        builder.Entity<IdentityUserLogin<Guid>>(b => b.ToTable("UserLogins"));
        builder.Entity<IdentityRoleClaim<Guid>>(b => b.ToTable("RoleClaims"));
        builder.Entity<IdentityUserToken<Guid>>(b => b.ToTable("UserTokens"));

        // User -> Sessions
        builder.Entity<UserSession>(b =>
        {
            b.HasIndex(s => s.UserId);
            b.HasIndex(s => s.LastActiveAt);
            b.HasIndex(s => s.ExpiresAt);
            b.HasOne(s => s.User)
             .WithMany(u => u.Sessions)
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // User -> ActivityLogs
        builder.Entity<ActivityLog>(b =>
        {
            b.HasIndex(a => a.Timestamp);
            b.HasOne(a => a.User)
             .WithMany(u => u.ActivityLogs)
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // Indexes for performance
        builder.Entity<Project>(b =>
        {
            b.HasIndex(p => p.Slug).IsUnique();
            b.HasIndex(p => p.SortOrder);
        });

        builder.Entity<BlogPost>(b =>
        {
            b.HasIndex(p => p.Slug).IsUnique();
            b.HasIndex(p => p.PublishedAt);
        });

        builder.Entity<Experience>(b =>
        {
            b.HasIndex(e => e.SortOrder);
        });

        builder.Entity<Skill>(b =>
        {
            b.HasIndex(s => s.Category);
            b.HasIndex(s => s.SortOrder);
        });

        builder.Entity<VisitorAnalytic>(b =>
        {
            b.HasIndex(v => v.Timestamp);
            b.HasIndex(v => v.Path);
        });

        builder.Entity<SystemLog>(b =>
        {
            b.HasIndex(s => s.Timestamp);
            b.HasIndex(s => s.Level);
        });
    }
}
