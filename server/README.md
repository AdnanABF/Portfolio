# Portfolio.API — ASP.NET Core (.NET 10) Backend

Backend Web API powering dynamic portfolio content, in-context CMS editing, telemetry, and contact leads for Adnan Bin Farook.

## Architecture

- **Runtime**: .NET 10 (C# 13)
- **Design**: Feature-Layered (Vertical Slice) architecture across 11 domains:
  - `Admin`: System health, sessions, audit log queries
  - `Auth`: ASP.NET Core Identity with HttpOnly cookies and sliding session management
  - `Blog`: Technical articles, tags, markdown publishing
  - `Contact`: Contact messages and repo access requests (saved, then emailed), email wording, rate limiting
  - `Experience`: Career timeline and accomplishments
  - `Health`: Real-time database latency and uptime telemetry
  - `Media`: Uploads stored on local disk (`uploads/`) under the API's content root; served back through `/api/media/{id}`
  - `Projects`: Portfolio case studies, live links, and metrics; `POST /api/projects/{slug}/access-requests` for private repositories
  - `Settings`: Dynamic site settings (bio, hero media, CV URL)
  - `Skills`: Categorized skills and proficiency levels
  - `Telemetry`: Proxy-aware page visits, CV downloads, and analytics
- **Database**: PostgreSQL with Entity Framework Core migrations
- **Caching**: ASP.NET Core Output Caching with tag-based invalidation
- **Security & Resilience**:
  - Client IP comes from `Connection.RemoteIpAddress`, rewritten by `UseForwardedHeaders` only for trusted proxies (`ForwardedHeaders:KnownNetworks`: loopback and Docker private ranges). Traefik (Coolify) is the only edge proxy; Cloudflare is DNS-only. Forwarded headers from any other source are ignored.
  - IP-partitioned rate limiting for login, contact submissions, and telemetry
  - RFC 7807 `ProblemDetails` with .NET 10 `IExceptionHandler`

## Email (Resend)

Shared sending lives in `Infrastructure/Email` (`IEmailSender`, `ResendEmailSender`); the wording of the emails lives with the feature in `Features/Contact/ContactEmailTemplates.cs`.

- **Contact form** (`POST /api/contact`): the message is saved, then the API emails the owner (Reply-To is the visitor) and sends the visitor a short fixed acknowledgement.
- **Repo access request** (`POST /api/projects/{slug}/access-requests`): only for published projects marked private (`IsRepoPrivate`). Saved in the same inbox table with `Type = repo_request` and the project, then the same two emails with repo-request wording.
- A failed email is logged and never fails the request; the message is already saved and visible in the admin inbox.
- Settings are in the `Resend` section (see `.env.example`). Outside Development the API refuses to start without `Resend:ApiKey`, `FromAddress`, `NotifyFromAddress` and `OwnerEmail`. In Development with no key, emails are written to the log instead of being sent.

## Admin inbox API

Messages and repo requests are managed through admin-only endpoints on `/api/contact`:

- `GET /api/contact/inquiries`: one page of the inbox. Query options: `search` (name, email, subject or message, case-insensitive), `status` (`unread`, `read`, `replied`, `archived`; empty means everything except archived), `type` (`contact`, `repo_request`), `from` (inclusive) and `to` (exclusive) as ISO instants, `page` (from 1) and `pageSize` (10, 20, 30 or 50, default 10). Returns `items`, `totalCount`, `page`, `pageSize` and `unreadCount` (all unread messages, whatever the filters).
- `PUT /api/contact/inquiries/{id}/status`: sets one status (body is the status as a JSON string). Unknown statuses are rejected.
- `POST /api/contact/inquiries/bulk-status`: body `{ "ids": [...], "status": "archived" }`, up to 100 ids. Returns `{ "updated": n }`.

## Running Locally

```powershell
cd server/Portfolio.API
dotnet run
```

To send real emails locally, add a `Resend` section to `appsettings.Development.json` (git-ignored, so a key never gets committed) with your own local-only API key:

```json
{
  "Resend": {
    "ApiKey": "re_...",
    "FromAddress": "hello@yourdomain.com",
    "NotifyFromAddress": "contact@yourdomain.com",
    "OwnerEmail": "you@example.com",
    "FromName": "Your Name"
  }
}
```

Leave `ApiKey` out (or the whole file absent) to just log emails to the console instead of sending them.
