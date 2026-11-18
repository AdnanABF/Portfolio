---
trigger: glob
globs: server/**
---

# Backend Conventions (server/, .NET 10)

## Structure
- One folder per domain in `Features/<Domain>/` (vertical slice). Follow the shape of `Features/Skills/`:
  - `<X>Controller.cs`: `[ApiController]`, `[Route("api/[controller]")]`, constructor injection into `private readonly _camelCase` fields.
  - `I<X>Service.cs` + `<X>Service.cs`: the business logic and `AppDbContext` access, registered in `Program.cs`.
  - `<X>Dtos.cs` and `<X>Validators.cs` (FluentValidation `AbstractValidator<T>`).
  - `<X>MappingExtensions.cs` (`ToDto()`, `ToEntity()`, `UpdateEntity()`) only when the feature maps entities to DTOs.
- Entities go in `Core/Entities/`. Shared cross-cutting code goes in `Infrastructure/`, not inside a feature.

## Patterns
- Validate in the controller with the injected `IValidator<T>`, and on failure return `BadRequest(validation.ToDictionary())`.
- Pass `CancellationToken` from the action through every async call. Wrap public read endpoints in `this.UnlessClientHungUp(...)`.
- Give every endpoint, or its controller, an explicit access attribute. `Program.cs` sets a fallback policy that requires Admin, so an endpoint with no attribute is silently admin-only:
  - `[AllowAnonymous]`: public
  - `[Authorize]`: any signed-in member
  - `[Authorize(Policy = "AdminOnly")]`: Admin or SuperAdmin
  - `[Authorize(Policy = "SuperAdminOnly")]`: owner only (members panel)
- Return hidden or draft data only when `User.IsAdmin()`.
- Read with `AsNoTracking()`. After every write:
  - log it with `IActivityLogger.LogAsync("<ENTITY>_<ACTION>", "<Entity>", id, "<summary>")`
  - evict the output cache with `IOutputCacheStore.EvictByTagAsync("<tag>")`
- For "not found", return `null`/`false` from the service and `NotFound()` from the controller. `GlobalExceptionHandler` turns unhandled exceptions into RFC 7807 `ProblemDetails`. Don't add try/catch just to return 500.
- User-facing messages are short, plain sentences (`"Send the ids in the new order."`).

## Tests
- All tests are xUnit, in `server/Portfolio.API.IntegrationTests/`.
- Endpoint behaviour: integration tests through `CustomWebApplicationFactory` against a real PostgreSQL database.
- Pure logic (validators, helpers, naming): plain unit tests without the factory, e.g. `InboxValidatorTests.cs`, `CvFileNameTests.cs`.
- Add to the existing file for the area. For a new area, name the file `<Area>IntegrationTests.cs` (endpoints) or `<Subject>Tests.cs` (unit).
- In integration tests, use the factory's seeded users (`AdminEmail`, `AdminOnlyEmail`, `RegularUserEmail`) and read emails from `factory.Emails`. Test members use the `MemberEmailDomain` domain.
- Tests run one class at a time (`TestAssemblyConfig.cs`). Don't turn on parallelism.
- Add or extend tests for every API behaviour change.
