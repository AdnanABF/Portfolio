using Portfolio.API.Features.Admin;

namespace Portfolio.API.IntegrationTests;

/// <summary>Rules for the admin activity-log and system-log queries. No database needed.</summary>
public class AdminLogQueryValidatorTests
{
    private readonly ActivityLogQueryValidator _activity = new();
    private readonly SystemLogQueryValidator _system = new();

    [Fact]
    public void Default_Queries_Are_Valid()
    {
        Assert.True(_activity.Validate(new ActivityLogQuery()).IsValid);
        Assert.True(_system.Validate(new SystemLogQuery()).IsValid);
    }

    [Theory]
    [InlineData(10, true)]
    [InlineData(20, true)]
    [InlineData(30, true)]
    [InlineData(50, true)]
    [InlineData(0, false)]
    [InlineData(15, false)]
    [InlineData(100000, false)]
    public void Page_Sizes_Are_Checked(int pageSize, bool valid)
    {
        Assert.Equal(valid, _activity.Validate(new ActivityLogQuery { PageSize = pageSize }).IsValid);
        Assert.Equal(valid, _system.Validate(new SystemLogQuery { PageSize = pageSize }).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Page_Must_Be_One_Or_Higher(int page)
    {
        Assert.False(_activity.Validate(new ActivityLogQuery { Page = page }).IsValid);
        Assert.False(_system.Validate(new SystemLogQuery { Page = page }).IsValid);
    }

    [Theory]
    [InlineData(ActivityLogQueryValidator.MaxPage, true)]
    [InlineData(ActivityLogQueryValidator.MaxPage + 1, false)]
    [InlineData(int.MaxValue, false)]
    public void Page_Is_Capped_So_The_Offset_Cannot_Overflow(int page, bool valid)
    {
        Assert.Equal(valid, _activity.Validate(new ActivityLogQuery { Page = page }).IsValid);
        Assert.Equal(valid, _system.Validate(new SystemLogQuery { Page = page }).IsValid);
    }

    [Fact]
    public void Search_Is_Limited_To_100_Characters()
    {
        Assert.True(_activity.Validate(new ActivityLogQuery { Search = new string('a', 100) }).IsValid);
        Assert.False(_activity.Validate(new ActivityLogQuery { Search = new string('a', 101) }).IsValid);
        Assert.True(_system.Validate(new SystemLogQuery { Search = new string('a', 100) }).IsValid);
        Assert.False(_system.Validate(new SystemLogQuery { Search = new string('a', 101) }).IsValid);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("Error", true)]
    [InlineData("warning", true)]
    [InlineData("INFORMATION", true)]
    [InlineData("Debug", false)]
    public void Levels_Are_Checked(string? level, bool valid)
    {
        Assert.Equal(valid, _system.Validate(new SystemLogQuery { Level = level }).IsValid);
    }

    [Fact]
    public void From_Must_Not_Be_After_To()
    {
        var now = DateTimeOffset.UtcNow;

        Assert.True(_activity.Validate(new ActivityLogQuery { From = now.AddDays(-1), To = now }).IsValid);
        Assert.True(_system.Validate(new SystemLogQuery { From = now.AddDays(-1), To = now }).IsValid);

        var activity = _activity.Validate(new ActivityLogQuery { From = now, To = now.AddDays(-1) });
        Assert.False(activity.IsValid);
        Assert.Contains(activity.Errors, e => e.PropertyName == "From");

        var system = _system.Validate(new SystemLogQuery { From = now, To = now.AddDays(-1) });
        Assert.False(system.IsValid);
        Assert.Contains(system.Errors, e => e.PropertyName == "From");
    }
}
