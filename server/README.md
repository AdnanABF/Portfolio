# Portfolio.API — ASP.NET Core (.NET 10) Backend

Backend Web API powering dynamic portfolio content, in-context CMS editing, telemetry, and contact leads for Adnan Bin Farook.

## Architecture

- **Runtime**: .NET 10 (C# 13)
- **Design**: Feature-Layered (Vertical Slice) architecture across 11 domains:
  - `Admin`: System health, sessions, audit log queries
  - `Auth`: ASP.NET Core Identity with HttpOnly cookies and sliding session management
  - `Blog`: Technical articles, tags, markdown publishing
  - `Contact`: Leads management, email validation, rate limiting
  - `Experience`: Career timeline and accomplishments
  - `Health`: Real-time database latency and uptime telemetry
  - `Media`: Presigned upload management for Cloudflare R2 / S3
  - `Projects`: Portfolio case studies, live links, and metrics
  - `Settings`: Dynamic site settings (bio, hero media, CV URL)
  - `Skills`: Categorized skills and proficiency levels
  - `Telemetry`: Proxy-aware page visits, CV downloads, and analytics
- **Database**: PostgreSQL with Entity Framework Core migrations
- **Caching**: ASP.NET Core Output Caching with tag-based invalidation
- **Security & Resilience**:
  - Client IP comes from `Connection.RemoteIpAddress`, rewritten by `UseForwardedHeaders` only for trusted proxies (`ForwardedHeaders:KnownNetworks`: loopback and Docker private ranges). Traefik (Coolify) is the only edge proxy; Cloudflare is DNS-only. Forwarded headers from any other source are ignored.
  - IP-partitioned rate limiting for login, contact submissions, and telemetry
  - RFC 7807 `ProblemDetails` with .NET 10 `IExceptionHandler`

## Running Locally

```powershell
cd server/Portfolio.API
dotnet run
```
