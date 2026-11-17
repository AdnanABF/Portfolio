# Portfolio.API — ASP.NET Core (.NET 10) Backend

Backend Web API powering the portfolio's content (edited from the admin home page editor), members, telemetry, and contact leads for Adnan Bin Farook.

## Architecture

- **Runtime**: .NET 10 (C# 13)
- **Design**: Feature-Layered (Vertical Slice) architecture across these domains:
  - `Admin`: System health, sessions, audit log queries
  - `Auth`: ASP.NET Core Identity with HttpOnly cookies and sliding session management
  - `Blog`: Technical articles, tags, markdown publishing
  - `Credentials`: Education entries and certifications
  - `Contact`: Contact messages and repo access requests (saved, then emailed), email wording, rate limiting
  - `Experience`: Career timeline and accomplishments
  - `Homepage`: The editable home page content (draft and published)
  - `Health`: Real-time database latency and uptime telemetry
  - `Media`: Uploads stored on local disk (`uploads/`) under the API's content root; served back through `/api/media/{id}`. A file uploaded in the `cv` category is always saved and downloaded as `Adnan CV <upload date>.pdf` (the date is the owner's day: `Media__CvUtcOffsetHours`, 3 for Kuwait)
  - `Projects`: Portfolio case studies, live links, and metrics; `POST /api/projects/{slug}/access-requests` for private repositories
  - `Skills`: Skills grouped by category (no percentages)
  - `Users`: The members panel and account management
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
- Settings are in the `Resend` section (see `.env.example`). Outside Development the API refuses to start without `Resend:ApiKey`, `FromAddress`, `NotifyFromAddress` and `OwnerEmail` (`FromName`, `SendAutoReply` and `SubjectPrefix` are optional). In Development with no key, emails are written to the log instead of being sent.

## Admin inbox API

Messages and repo requests are managed through admin-only endpoints on `/api/contact`:

- `GET /api/contact/inquiries`: one page of the inbox. Query options: `search` (name, email, subject or message, case-insensitive), `status` (`unread`, `read`, `replied`, `archived`; empty means everything except archived), `type` (`contact`, `repo_request`), `from` (inclusive) and `to` (exclusive) as ISO instants, `page` (from 1) and `pageSize` (10, 20, 30 or 50, default 10). Returns `items`, `totalCount`, `page`, `pageSize` and `unreadCount` (all unread messages, whatever the filters).
- `GET /api/admin/activity`: one page of the activity log. Query options: `search` (action, summary, user email or entity type), `action`, `entityType` (exact), `from` (inclusive) and `to` (exclusive) as ISO instants, `page` (from 1) and `pageSize` (10, 20, 30 or 50, default 10). Returns `items`, `totalCount`, `page`, `pageSize`, plus `actions` and `entityTypes` (every value in the log, for filter dropdowns).
- `GET /api/admin/system-logs`: one page of the error log. Query options: `search` (message, path or exception), `level` (`Error`, `Warning`, `Information`), `from`, `to`, `page`, `pageSize` as above. Returns `items`, `totalCount`, `page`, `pageSize` and `errorCount`, `warningCount`, `informationCount` (whatever the filters).
- `PUT /api/contact/inquiries/{id}/status`: sets one status (body is the status as a JSON string). Unknown statuses are rejected.
- `POST /api/contact/inquiries/bulk-status`: body `{ "ids": [...], "status": "archived" }`, up to 100 ids. Returns `{ "updated": n }`.

## Activity log

Admin changes, sign-ins and a few visitor actions are written to the activity log (`/api/admin/activity`). Each entry has the actor, the action, what it was about, the IP and the device (from the `User-Agent`).

- Visitors who are not signed in appear as the actor `visitor` (or their email for a contact message): failed sign-ins (`LOGIN_FAILED`, at most one per address and account every 5 minutes; the password is never recorded, and for an account that does not exist the typed text is kept only if it looks like an email) and CV downloads (`CV_DOWNLOAD`).
- A CV download is logged and counted by the API when the CV file is served. The owner's own preview, crawlers and link previews, the later parts of a ranged request and repeats from the same IP within 10 minutes are not counted.
- Uploading and deleting media (`MEDIA_UPLOAD`, `MEDIA_DELETE`) and revoking sessions (`SESSION_REVOKE`, `USER_SESSIONS_REVOKE_ALL`, which name the member, the device and how many sessions) are logged. A member's history (`GET /api/admin/users/{id}/activity`) lists what they did and what was done to their account.
- The website's server forwards the visitor's IP chain and `User-Agent` for the contact form, so the log shows the visitor's device rather than the server's.

## Members and accounts

There are three roles. **SuperAdmin** is the owner: the one account whose email is the configured `Admin:Email`. It cannot be edited, turned off, deleted or demoted, and no one else can hold the role (at startup anyone else with it drops to Admin). **Admin** can use the admin area but not the members panel. **Member** is a signed-in visitor with no admin access. A member's status is worked out in this order: deleted, inactive, pending (email not confirmed), active.

Members panel (SuperAdmin only), under `/api/admin/users`:

- `GET /api/admin/users`: one page of members. Query options: `search` (name, email or username), `role`, `status` (`active`, `pending`, `inactive`, `deleted`; empty means everyone except deleted), `page`, `pageSize` as above. Returns `items`, `totalCount`, `page`, `pageSize` and `stats` (total users, counts per status and role, and `loggedInLast30Days`, whatever the filters).
- `POST /api/admin/users` adds a member and sends an invite email; `PUT /{id}` edits name, email and role (Admin or Member). Changing the role or email signs the member out.
- `POST /{id}/activate` and `/deactivate`, `DELETE /{id}` (soft delete) and `POST /{id}/restore`. Deactivating or deleting ends all of the member's sessions.
- `DELETE /{id}/erase` with `{ "confirmEmail": "..." }` removes the account for good. In one transaction it replaces the member's name, email, IP and device in the activity log (rows they wrote, rows about them, and other rows that mention their email), in contact inquiries sent from their email, and in system log messages and exceptions, and it clears who uploaded any media. It does not touch database backups or logs kept outside the database (for example your hosting provider's).
- `POST /{id}/resend-invite` and `POST /{id}/reset-password` send an email. Both return `{ "emailSent": bool }`.
- `GET /{id}/sessions` (`includeEnded=true` to include ended ones), `DELETE /{id}/sessions/{sessionId}`, `POST /{id}/sessions/revoke-all`, and `GET /{id}/activity` (that member's activity log entries, paged).
- Safety rules answer `409`: nobody can act on their own account or the SuperAdmin, and the last active admin cannot be removed.

Public account endpoints under `/api/auth` (rate limited; they never reveal whether an email has an account):

- `POST register` (sign-up; see the bot traps below), `POST verify-email`, `POST accept-invite`, `POST forgot-password`, `POST reset-password`, `POST resend-verification`.
- Signed in: `PUT profile`, `POST change-password`, plus the existing `GET sessions`, `DELETE sessions/{id}` and `POST sessions/revoke-all`.
- Sign-in answers `403` with `code` `email_not_verified` or `account_disabled`, but only after the password was correct.
- Email links point to `App__PublicBaseUrl` and work for 3 days. It must be set outside Development: the API refuses to start without it.
- Sign-up and sign-in bot traps use `contact_pref_url` (hidden field) and `fillTimeMs` (milliseconds the form was open, at least 3000). A second forgot-password or resend-verification for the same address within 2 minutes sends nothing.
- If the owner email in `Admin__Email` changes, the previous owner keeps SuperAdmin and a warning is logged. Set `Admin__DemoteFormerOwners=true` for one start to demote them to Admin.

## Home page content

Everything on the public home page that is plain content (name, photo, CV, titles, links, availability, location, About cards, section order and headings, search title and description) is one JSON document with two copies: a **draft** and the **published** version. Visitors only ever see the published one.

- `GET /api/site-content` (public, cached): the published content.
- `GET /api/admin/site-content`: the draft, with `hasUnpublishedChanges`, who saved it and when.
- `PUT /api/admin/site-content`: saves the draft. Links and images must start with `https://`, `mailto:`, `tel:` or `/`, lists have size limits, links and About cards need their own ids, and every section (about, experience, education, skills, projects, certifications, contact) appears exactly once.
- `POST /api/admin/site-content/publish` copies the draft to the published version and clears the cache. `POST /api/admin/site-content/discard` resets the draft to the published version.

Experience, education, skills, projects and certifications keep their own endpoints (`/api/experience`, `/api/education`, `/api/skills`, `/api/projects`, `/api/certifications`) and save immediately. `GET` on these lists only returns hidden items (or unpublished projects) for admins who add `?includeHidden=true` (`includeDrafts=true` for projects). `PUT .../order` on each list takes `{ "ids": [...] }` in the new display order; ids you leave out follow after the ones you list.

The home page data comes from the owner's CV (`CvSeedData`, `HomepageContentDefaults`; phone number and visa details are not included). `CvSeedData.Version` marks which CV the data is from. On every start the API compares it with the version stored in the database: when they differ, which is a new database or a deploy that brought a newer CV, the old experience, education, certifications, skills, home page text and the old editor's setting are replaced with the CV data in one transaction, and the CV's projects are updated. The uploaded photo and CV file, blog posts, messages, members, other settings and projects you added are kept, and projects with the same page address keep their id (so access requests stay linked). On the very first CV seed, projects that are not in the CV are removed. When the version matches, nothing is replaced, so edits made in the admin hub survive restarts. To publish a newer CV: update the data in those two files and change `Version`. `Content__ReplaceWithCvSeed=true` forces a replacement on one start, and also removes projects that are not in the CV (switch it off again).

## Configuration

Every setting, with an explanation, is listed in `.env.example` (deployment, as environment variables) and `Portfolio.API/appsettings.json` (defaults). Required outside Development: `ConnectionStrings__DefaultConnection`, `Admin__Email`, `Admin__Password`, `App__PublicBaseUrl` and the four required `Resend__*` values. Outside Development, uploaded files live in `Storage__LocalPath` (default `uploads` inside the container), which must be a persistent volume.

Sessions use an encrypted cookie. The keys are stored in the database, so restoring a database from another place signs everyone out. Passwords are stored only as salted hashes (ASP.NET Core Identity).

## Running Locally

```powershell
cd server/Portfolio.API
dotnet run
```

For local settings, create `Portfolio.API/appsettings.Development.json` (git-ignored, so passwords and keys never get committed) and override what you need from `appsettings.json`: the database connection, `Admin` (the owner account) and `Resend`. Leave the Resend `ApiKey` empty to just log emails to the console instead of sending them.

To send real emails locally, put your own local-only Resend API key in that file:

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
