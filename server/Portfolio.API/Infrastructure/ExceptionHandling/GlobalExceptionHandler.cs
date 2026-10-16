using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Portfolio.API.Common.Exceptions;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;

namespace Portfolio.API.Infrastructure.ExceptionHandling;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IServiceProvider _serviceProvider;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception occurred at {Path}", httpContext.Request.Path);

        var (statusCode, title) = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            FluentValidation.ValidationException => (StatusCodes.Status400BadRequest, "Validation Failed"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        await LogToDatabaseAsync(httpContext, exception, statusCode);

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        };

        if (exception is FluentValidation.ValidationException validationEx)
        {
            problemDetails.Extensions["errors"] = validationEx.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }

    private async Task LogToDatabaseAsync(HttpContext context, Exception ex, int statusCode)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var log = new SystemLog
            {
                Level = statusCode >= 500 ? "Error" : "Warning",
                Message = ex.Message,
                Exception = ex.GetType().FullName,
                StackTrace = ex.StackTrace,
                Path = context.Request.Path,
                HttpMethod = context.Request.Method,
                StatusCode = statusCode,
                IpAddress = ip,
                Timestamp = DateTime.UtcNow
            };

            await dbContext.SystemLogs.AddAsync(log);
            await dbContext.SaveChangesAsync();
        }
        catch
        {
            // Fail silently to prevent recursive crash
        }
    }
}
