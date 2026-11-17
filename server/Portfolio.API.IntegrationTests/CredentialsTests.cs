using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// Education entries and certifications: validation, hidden items (only admins can list them), reordering and
/// deleting. Each test removes what it created. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class CredentialsTests : IClassFixture<MembersFactory>
{
    private readonly MembersFactory _factory;

    public CredentialsTests(MembersFactory factory)
    {
        _factory = factory;
    }

    private static async Task<Guid> IdOf(HttpResponseMessage res) =>
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

    private static object Education(string institution, bool visible = true) => new
    {
        institution, qualification = "Test course", location = "Somewhere", period = "2020 - 2021",
        details = new[] { "A detail" }, sortOrder = 900, isVisible = visible
    };

    [Fact]
    public async Task Education_Needs_An_Institution_And_A_Qualification()
    {
        var res = await _factory.Admin.PostAsJsonAsync("/api/education", new { institution = "", qualification = "" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task A_Hidden_Education_Entry_Is_Only_Listed_For_Admins_Who_Ask_For_It()
    {
        var name = $"Hidden School {Guid.NewGuid():N}";
        var created = await _factory.Admin.PostAsJsonAsync("/api/education", Education(name, visible: false));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = await IdOf(created);
        try
        {
            var anonymous = _factory.NewClient();
            Assert.DoesNotContain(name, await anonymous.GetStringAsync("/api/education"));
            Assert.DoesNotContain(name, await anonymous.GetStringAsync("/api/education?includeHidden=true"));
            Assert.DoesNotContain(name, await _factory.Admin.GetStringAsync("/api/education"));
            Assert.Contains(name, await _factory.Admin.GetStringAsync("/api/education?includeHidden=true"));
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/education/{id}");
        }
    }

    [Fact]
    public async Task Education_Can_Be_Updated_Reordered_And_Deleted()
    {
        var first = await IdOf(await _factory.Admin.PostAsJsonAsync("/api/education", Education($"A-{Guid.NewGuid():N}")));
        var second = await IdOf(await _factory.Admin.PostAsJsonAsync("/api/education", Education($"B-{Guid.NewGuid():N}")));
        try
        {
            var update = await _factory.Admin.PutAsJsonAsync($"/api/education/{first}", Education("Renamed school"));
            Assert.Equal(HttpStatusCode.OK, update.StatusCode);
            Assert.Equal("Renamed school", (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("institution").GetString());

            Assert.Equal(HttpStatusCode.NoContent, (await _factory.Admin.PutAsJsonAsync("/api/education/order", new { ids = new[] { second, first } })).StatusCode);
            var list = await _factory.Admin.GetFromJsonAsync<JsonElement>("/api/education?includeHidden=true");
            var ids = list.EnumerateArray().Select(e => e.GetProperty("id").GetGuid()).ToList();
            Assert.True(ids.IndexOf(second) < ids.IndexOf(first));

            Assert.Equal(HttpStatusCode.NotFound, (await _factory.Admin.PutAsJsonAsync("/api/education/order", new { ids = new[] { Guid.NewGuid() } })).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await _factory.Admin.DeleteAsync($"/api/education/{Guid.NewGuid()}")).StatusCode);
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/education/{first}");
            await _factory.Admin.DeleteAsync($"/api/education/{second}");
        }
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("http://insecure.example")]
    public async Task A_Certification_Link_Must_Be_Safe(string url)
    {
        var res = await _factory.Admin.PostAsJsonAsync("/api/certifications", new { title = "Cert", issuer = "Someone", issuedOn = "2026", credentialUrl = url });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Certifications_Can_Be_Created_Hidden_And_Reordered()
    {
        var title = $"Cert-{Guid.NewGuid():N}";
        var created = await _factory.Admin.PostAsJsonAsync("/api/certifications",
            new { title, issuer = "Issuer", issuedOn = "May 2026", credentialUrl = "https://example.com/verify", sortOrder = 900, isVisible = false });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = await IdOf(created);
        var other = await IdOf(await _factory.Admin.PostAsJsonAsync("/api/certifications", new { title = $"Other-{Guid.NewGuid():N}", sortOrder = 901 }));
        try
        {
            Assert.DoesNotContain(title, await _factory.NewClient().GetStringAsync("/api/certifications?includeHidden=true"));
            Assert.Contains(title, await _factory.Admin.GetStringAsync("/api/certifications?includeHidden=true"));

            Assert.Equal(HttpStatusCode.NoContent, (await _factory.Admin.PutAsJsonAsync("/api/certifications/order", new { ids = new[] { other, id } })).StatusCode);
            var list = await _factory.Admin.GetFromJsonAsync<JsonElement>("/api/certifications?includeHidden=true");
            var ids = list.EnumerateArray().Select(e => e.GetProperty("id").GetGuid()).ToList();
            Assert.True(ids.IndexOf(other) < ids.IndexOf(id));
        }
        finally
        {
            await _factory.Admin.DeleteAsync($"/api/certifications/{id}");
            await _factory.Admin.DeleteAsync($"/api/certifications/{other}");
        }
    }
}
