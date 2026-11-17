using Microsoft.AspNetCore.Mvc;

namespace Portfolio.API.Infrastructure.Extensions;

public static class ClientAbortExtensions
{
    /// <summary>
    /// Runs a read action and, when the caller hangs up mid-request (page change, reload, closed tab), answers
    /// 499 instead of letting the cancellation travel up as an exception. Nobody is waiting for the answer, so
    /// this is not an error. A cancellation the caller did not cause (for example a database timeout) still throws.
    /// </summary>
    public static async Task<ActionResult<T>> UnlessClientHungUp<T>(
        this ControllerBase controller,
        Func<Task<ActionResult<T>>> action,
        CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return controller.StatusCode(StatusCodes.Status499ClientClosedRequest);
        }
    }
}
