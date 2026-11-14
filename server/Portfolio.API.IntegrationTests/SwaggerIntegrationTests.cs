using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Portfolio.API.IntegrationTests;

public class SwaggerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SwaggerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerDocument_Generates_And_Includes_Media_Upload()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.GetAsync("/swagger/v1/swagger.json");
        var body = await response.Content.ReadAsStringAsync();

        Assert.True(response.StatusCode == HttpStatusCode.OK, $"Swagger generation failed: {body}");
        // The route comes from the controller name, so it is written "/api/Media/upload"; compare ignoring case.
        Assert.Contains("/api/media/upload", body, StringComparison.OrdinalIgnoreCase);
    }
}
