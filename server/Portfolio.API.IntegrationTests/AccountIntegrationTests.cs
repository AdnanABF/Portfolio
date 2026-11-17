using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.API.Core.Data;
using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Auth;

namespace Portfolio.API.IntegrationTests;

/// <summary>
/// Public sign-up, email verification, password reset, and a signed-in member's own password and profile.
/// Emails are captured, so the tests follow the real links. Needs the test database (TEST_CONNECTION_STRING).
/// </summary>
public class AccountIntegrationTests : IClassFixture<MembersFactory>
{
    private const string Password = "member-pass-1";

    private readonly MembersFactory _factory;

    public AccountIntegrationTests(MembersFactory factory)
    {
        _factory = factory;
    }

    private static string NewEmail() => $"s-{Guid.NewGuid():N}{CustomWebApplicationFactory.MemberEmailDomain}";

    /// <summary>A sign-up as a person would send it: the form was open for a while and the hidden field is empty.</summary>
    private static object SignUp(string email, string password = Password, string? contactPrefUrl = null, long? fillTimeMs = 30_000) => new
    {
        fullName = "Sign Up Tester",
        email,
        password,
        contactPrefUrl,
        fillTimeMs
    };

    private async Task<bool> UserExistsAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.AnyAsync(u => u.Email == email);
    }

    private async Task<HttpClient> RegisterVerifiedAndSignInAsync(string email)
    {
        var client = _factory.NewClient();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register", SignUp(email))).StatusCode);

        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "verify-email");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId, token })).StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        return client;
    }

    // ---- sign-up ----------------------------------------------------------------------------------

    [Fact]
    public async Task Sign_Up_Creates_A_Pending_Member_Who_Must_Verify_Before_Signing_In()
    {
        var email = NewEmail();
        var client = _factory.NewClient();

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register", SignUp(email))).StatusCode);
        Assert.Equal(1, TestMail.Count(_factory.Emails, email, "verify-email"));

        // The password was chosen, but the email is not confirmed yet: the right password still cannot sign in.
        var early = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password });
        Assert.Equal(HttpStatusCode.Forbidden, early.StatusCode);
        Assert.Equal("email_not_verified", (await early.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());

        // A wrong password does not reveal that the account is waiting for verification.
        var wrong = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "wrong-password-9" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "verify-email");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId, token })).StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var me = await (await client.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<UserDto>();
        Assert.False(me!.IsAdmin);
        Assert.Equal("Member", me.Role);
    }

    [Fact]
    public async Task Sign_Up_With_A_Taken_Email_Looks_Exactly_Like_Success_And_Sends_Nothing()
    {
        var email = NewEmail();
        var first = await _factory.NewClient().PostAsJsonAsync("/api/auth/register", SignUp(email));
        var second = await _factory.NewClient().PostAsJsonAsync("/api/auth/register", SignUp(email));

        Assert.Equal(first.StatusCode, second.StatusCode);
        Assert.Equal(
            (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString(),
            (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
        Assert.Equal(1, TestMail.Count(_factory.Emails, email, "verify-email"));
    }

    [Fact]
    public async Task Sign_Up_Rejects_A_Weak_Password_And_A_Bad_Email_With_Field_Errors()
    {
        var client = _factory.NewClient();

        var weak = await client.PostAsJsonAsync("/api/auth/register", SignUp(NewEmail(), password: "short"));
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        // Long enough for the form rules but missing a digit: Identity's own rule answers.
        var noDigit = await client.PostAsJsonAsync("/api/auth/register", SignUp(NewEmail(), password: "nodigitshere"));
        Assert.Equal(HttpStatusCode.BadRequest, noDigit.StatusCode);
        Assert.True((await noDigit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").TryGetProperty("password", out _));

        var badEmail = await client.PostAsJsonAsync("/api/auth/register", SignUp("not-an-email"));
        Assert.Equal(HttpStatusCode.BadRequest, badEmail.StatusCode);
    }

    [Fact]
    public async Task Sign_Up_Bot_Traps_Answer_Like_Success_But_Create_Nobody()
    {
        var client = _factory.NewClient();

        var honeypot = NewEmail();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register", SignUp(honeypot, contactPrefUrl: "http://spam.example"))).StatusCode);
        Assert.False(await UserExistsAsync(honeypot));

        var tooFast = NewEmail();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register", SignUp(tooFast, fillTimeMs: 500))).StatusCode);
        Assert.False(await UserExistsAsync(tooFast));

        var noTimer = NewEmail();
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/register",
            new { fullName = "No Timer", email = noTimer, password = Password })).StatusCode);
        Assert.False(await UserExistsAsync(noTimer));

        Assert.Equal(0, TestMail.Count(_factory.Emails, honeypot, "verify-email")
            + TestMail.Count(_factory.Emails, tooFast, "verify-email")
            + TestMail.Count(_factory.Emails, noTimer, "verify-email"));
    }

    [Fact]
    public async Task Sign_Up_Only_Looks_At_How_Long_The_Form_Was_Open_Never_At_The_Visitors_Clock()
    {
        // The browser sends elapsed milliseconds. Whatever its clock says, a slow enough form is a person.
        var slow = NewEmail();
        Assert.Equal(HttpStatusCode.Accepted, (await _factory.NewClient().PostAsJsonAsync("/api/auth/register", SignUp(slow, fillTimeMs: 3_000))).StatusCode);
        Assert.True(await UserExistsAsync(slow));

        var quick = NewEmail();
        Assert.Equal(HttpStatusCode.Accepted, (await _factory.NewClient().PostAsJsonAsync("/api/auth/register", SignUp(quick, fillTimeMs: 2_999))).StatusCode);
        Assert.False(await UserExistsAsync(quick));
    }

    [Fact]
    public async Task A_Verification_Link_Only_Works_For_Its_Own_Account_And_Not_When_It_Is_Garbled()
    {
        var emailA = NewEmail();
        var emailB = NewEmail();
        var client = _factory.NewClient();
        await client.PostAsJsonAsync("/api/auth/register", SignUp(emailA));
        await client.PostAsJsonAsync("/api/auth/register", SignUp(emailB));

        var (idA, tokenA) = TestMail.LastLink(_factory.Emails, emailA, "verify-email");
        var (idB, _) = TestMail.LastLink(_factory.Emails, emailB, "verify-email");

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId = idB, token = tokenA })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId = idA, token = "%%not-a-token%%" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId = Guid.NewGuid(), token = tokenA })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/verify-email", new { userId = idA, token = tokenA })).StatusCode);
    }

    [Fact]
    public async Task Resend_Verification_Is_Neutral_And_Only_Sends_To_Unverified_Accounts()
    {
        var email = NewEmail();
        var client = _factory.NewClient();
        await client.PostAsJsonAsync("/api/auth/register", SignUp(email));

        var unknown = await client.PostAsJsonAsync("/api/auth/resend-verification", new { email = NewEmail() });
        Assert.Equal(HttpStatusCode.OK, unknown.StatusCode);

        var known = await client.PostAsJsonAsync("/api/auth/resend-verification", new { email });
        Assert.Equal(HttpStatusCode.OK, known.StatusCode);
        Assert.Equal(2, TestMail.Count(_factory.Emails, email, "verify-email"));

        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "verify-email");
        await client.PostAsJsonAsync("/api/auth/verify-email", new { userId, token });

        // Verified now: asking again sends nothing more.
        await client.PostAsJsonAsync("/api/auth/resend-verification", new { email });
        Assert.Equal(2, TestMail.Count(_factory.Emails, email, "verify-email"));
    }

    // ---- forgot and reset password ------------------------------------------------------------------

    [Fact]
    public async Task Forgot_Password_Is_Neutral_And_The_Link_Sets_A_New_Password_And_Signs_Out_Other_Devices()
    {
        var email = NewEmail();
        var device = await RegisterVerifiedAndSignInAsync(email);
        Assert.Equal(HttpStatusCode.OK, (await device.GetAsync("/api/auth/me")).StatusCode);

        var client = _factory.NewClient();
        var before = _factory.Emails.Sent.Count;

        // An unknown address gets the same answer and no email.
        var unknown = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = NewEmail() });
        Assert.Equal(HttpStatusCode.OK, unknown.StatusCode);
        Assert.Equal(before, _factory.Emails.Sent.Count);

        var known = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, known.StatusCode);
        Assert.Equal(1, TestMail.Count(_factory.Emails, email, "reset-password"));

        var (userId, token) = TestMail.LastLink(_factory.Emails, email, "reset-password");
        var weak = await client.PostAsJsonAsync("/api/auth/reset-password", new { userId, token, password = "nodigitshere" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/reset-password", new { userId, token, password = "brand-new-pass-3" })).StatusCode);

        // The old device is signed out, the old password fails, the new one works, and the link cannot be reused.
        Assert.Equal(HttpStatusCode.Unauthorized, (await device.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "brand-new-pass-3" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/reset-password", new { userId, token, password = "yet-another-pass-4" })).StatusCode);
    }

    [Fact]
    public async Task Asking_Again_For_The_Same_Link_Within_A_Couple_Of_Minutes_Sends_Nothing_More()
    {
        var email = NewEmail();
        await RegisterVerifiedAndSignInAsync(email);
        var client = _factory.NewClient();

        // Both requests get the normal answer, but only the first one sends an email: nobody can use the form
        // to flood an inbox.
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/forgot-password", new { email })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/forgot-password", new { email })).StatusCode);
        Assert.Equal(1, TestMail.Count(_factory.Emails, email, "reset-password"));
    }

    [Fact]
    public async Task Forgot_Password_Sends_Nothing_To_A_Turned_Off_Account()
    {
        var email = NewEmail();
        await RegisterVerifiedAndSignInAsync(email);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Users.Where(u => u.Email == email).ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));
        }

        var res = await _factory.NewClient().PostAsJsonAsync("/api/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(0, TestMail.Count(_factory.Emails, email, "reset-password"));
    }

    // ---- the signed-in member's own account ------------------------------------------------------------

    [Fact]
    public async Task Change_Password_Checks_The_Current_One_And_Signs_Out_Only_The_Other_Devices()
    {
        var email = NewEmail();
        var thisDevice = await RegisterVerifiedAndSignInAsync(email);

        var otherDevice = _factory.NewClient();
        (await otherDevice.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = Password })).EnsureSuccessStatusCode();

        var wrongCurrent = await thisDevice.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "not-my-password-1", newPassword = "changed-pass-5" });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);
        Assert.True((await wrongCurrent.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").TryGetProperty("currentPassword", out _));

        var ok = await thisDevice.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = Password, newPassword = "changed-pass-5" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await thisDevice.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherDevice.GetAsync("/api/auth/me")).StatusCode);

        var fresh = await _factory.NewClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = "changed-pass-5" });
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
    }

    [Fact]
    public async Task Profile_Name_Can_Be_Changed_By_The_Signed_In_Member_Only()
    {
        var email = NewEmail();
        var client = await RegisterVerifiedAndSignInAsync(email);

        var res = await client.PutAsJsonAsync("/api/auth/profile", new { fullName = "  New Name  " });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("New Name", (await res.Content.ReadFromJsonAsync<UserDto>())!.FullName);

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/auth/profile", new { fullName = "" })).StatusCode);

        var anonymous = _factory.NewClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync("/api/auth/profile", new { fullName = "Nope" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "a", newPassword = "b" })).StatusCode);
    }

    [Fact]
    public async Task A_Member_Can_See_And_Revoke_Their_Own_Sessions_But_Not_Use_The_Admin_Area()
    {
        var email = NewEmail();
        var client = await RegisterVerifiedAndSignInAsync(email);

        var sessions = await (await client.GetAsync("/api/auth/sessions")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, sessions.GetArrayLength());
        Assert.True(sessions[0].GetProperty("isCurrent").GetBoolean());

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/activity")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users")).StatusCode);
    }
}

/// <summary>The public account endpoints are rate limited. Uses the normal limits, so it has its own host.</summary>
public class AccountRateLimitTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AccountRateLimitTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Forgot_Password_Is_Limited_To_Ten_Requests_Per_Window()
    {
        var client = _factory.CreateClient();
        var statuses = new List<HttpStatusCode>();

        for (var i = 0; i < 11; i++)
        {
            var res = await client.PostAsJsonAsync("/api/auth/forgot-password", new { email = $"nobody-{i}@members.test" });
            statuses.Add(res.StatusCode);
        }

        Assert.All(statuses.Take(10), s => Assert.Equal(HttpStatusCode.OK, s));
        Assert.Equal(HttpStatusCode.TooManyRequests, statuses[10]);

        // Finishing a reset with an emailed link has its own, larger allowance: a busy address that used up
        // the "send me an email" requests can still use a link it already has (the answer here is 400 for a
        // made-up link, not 429).
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email", new { userId = Guid.NewGuid(), token = "abc" });
        Assert.Equal(HttpStatusCode.BadRequest, verify.StatusCode);
    }
}
