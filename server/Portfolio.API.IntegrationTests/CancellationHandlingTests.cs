using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Portfolio.API.Common.Exceptions;
using Portfolio.API.Features.Health;
using Portfolio.API.Infrastructure.ExceptionHandling;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// A client hanging up mid-request (timeout, reload, closed tab) is normal and must not be treated as a
/// server error. These tests need no database.
/// </summary>
public class CancellationHandlingTests
{
    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<LogLevel> Levels { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Levels.Add(logLevel);
    }

    private static DefaultHttpContext NewContext(bool clientHungUp)
    {
        var context = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().BuildServiceProvider()
        };
        context.Response.Body = new MemoryStream();

        if (clientHungUp)
        {
            var source = new CancellationTokenSource();
            source.Cancel();
            context.RequestAborted = source.Token;
        }

        return context;
    }

    private static (GlobalExceptionHandler Handler, RecordingLogger<GlobalExceptionHandler> Logger) NewHandler()
    {
        var logger = new RecordingLogger<GlobalExceptionHandler>();
        // The handler only touches the service provider to write a SystemLog row; with none available that step
        // fails quietly, which is also how it behaves when the database is down.
        var handler = new GlobalExceptionHandler(logger, new ServiceCollection().BuildServiceProvider());
        return (handler, logger);
    }

    // ---- GlobalExceptionHandler --------------------------------------------------------------

    [Fact]
    public async Task Cancellation_After_The_Client_Hung_Up_Is_Handled_Quietly()
    {
        var (handler, logger) = NewHandler();
        var context = NewContext(clientHungUp: true);

        var handled = await handler.TryHandleAsync(context, new OperationCanceledException(), CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status499ClientClosedRequest, context.Response.StatusCode);
        Assert.DoesNotContain(LogLevel.Error, logger.Levels);
        Assert.Equal(0, context.Response.Body.Length); // no error body is written for a client that left
    }

    [Fact]
    public async Task A_Task_Cancelled_Exception_Counts_As_A_Cancellation_Too()
    {
        var (handler, logger) = NewHandler();
        var context = NewContext(clientHungUp: true);

        var handled = await handler.TryHandleAsync(context, new TaskCanceledException(), CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status499ClientClosedRequest, context.Response.StatusCode);
        Assert.DoesNotContain(LogLevel.Error, logger.Levels);
    }

    [Fact]
    public async Task A_Cancellation_While_The_Client_Is_Still_Connected_Is_Still_A_Server_Error()
    {
        var (handler, logger) = NewHandler();
        var context = NewContext(clientHungUp: false);

        var handled = await handler.TryHandleAsync(context, new OperationCanceledException(), CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Contains(LogLevel.Error, logger.Levels);
    }

    [Fact]
    public async Task Other_Exceptions_Keep_Their_Status_Codes_Even_If_The_Client_Left()
    {
        var (handler, logger) = NewHandler();

        var notFound = NewContext(clientHungUp: false);
        await handler.TryHandleAsync(notFound, new NotFoundException("Project", "x"), CancellationToken.None);

        var broken = NewContext(clientHungUp: true);
        await handler.TryHandleAsync(broken, new InvalidOperationException("boom"), CancellationToken.None);

        Assert.Equal(StatusCodes.Status404NotFound, notFound.Response.StatusCode);
        Assert.Equal(StatusCodes.Status500InternalServerError, broken.Response.StatusCode);
        Assert.Equal(2, logger.Levels.Count(level => level == LogLevel.Error));
    }

    // ---- HealthController --------------------------------------------------------------------

    private sealed class FakeHealthService(Func<CancellationToken, Task<HealthResponseDto>> check) : IHealthService
    {
        public Task<HealthResponseDto> CheckHealthAsync(CancellationToken cancellationToken = default) => check(cancellationToken);
    }

    [Fact]
    public async Task Health_Returns_The_Result_When_The_Check_Succeeds()
    {
        var controller = new HealthController(new FakeHealthService(_ => Task.FromResult(new HealthResponseDto { Status = "healthy" })));

        var result = await controller.GetHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("healthy", Assert.IsType<HealthResponseDto>(ok.Value).Status);
    }

    [Fact]
    public async Task Health_Answers_499_Instead_Of_Throwing_When_The_Caller_Hung_Up()
    {
        using var source = new CancellationTokenSource();
        var controller = new HealthController(new FakeHealthService(token =>
        {
            source.Cancel(); // the caller leaves while the database check is running
            token.ThrowIfCancellationRequested();
            return Task.FromResult(new HealthResponseDto());
        }));

        var result = await controller.GetHealth(source.Token);

        var status = Assert.IsType<StatusCodeResult>(result.Result);
        Assert.Equal(StatusCodes.Status499ClientClosedRequest, status.StatusCode);
    }

    [Fact]
    public async Task Health_Does_Not_Hide_A_Cancellation_That_Was_Not_Caused_By_The_Caller()
    {
        // For example a database timeout: the caller is still waiting, so this is a real failure.
        var controller = new HealthController(new FakeHealthService(_ => throw new OperationCanceledException()));

        await Assert.ThrowsAsync<OperationCanceledException>(() => controller.GetHealth(CancellationToken.None));
    }
}
