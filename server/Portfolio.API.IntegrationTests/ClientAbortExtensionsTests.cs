using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Portfolio.API.Infrastructure.Extensions;

namespace Portfolio.API.IntegrationTests;

/// <summary>Read endpoints answer 499 when the caller hangs up, instead of letting the cancellation escape. No database needed.</summary>
public class ClientAbortExtensionsTests
{
    private sealed class TestController : ControllerBase { }

    [Fact]
    public async Task Returns_499_When_The_Caller_Hung_Up()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var result = await new TestController().UnlessClientHungUp<string>(
            () => throw new OperationCanceledException(cts.Token), cts.Token);

        var status = Assert.IsType<StatusCodeResult>(result.Result);
        Assert.Equal(StatusCodes.Status499ClientClosedRequest, status.StatusCode);
    }

    [Fact]
    public async Task Does_Not_Hide_A_Cancellation_The_Caller_Did_Not_Cause()
    {
        // For example a database timeout: the caller is still waiting, so this is a real failure.
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            new TestController().UnlessClientHungUp<string>(
                () => throw new OperationCanceledException(), CancellationToken.None));
    }

    [Fact]
    public async Task Passes_Through_A_Normal_Result()
    {
        var result = await new TestController().UnlessClientHungUp<string>(
            () => Task.FromResult<ActionResult<string>>(new OkObjectResult("ok")), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
    }
}
