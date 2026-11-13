using Portfolio.API.Core.Entities;
using Portfolio.API.Features.Contact;

namespace Portfolio.API.IntegrationTests;

/// <summary>Rules for the admin inbox query and bulk-update requests. No database needed.</summary>
public class InboxValidatorTests
{
    private readonly ContactInquiryQueryValidator _query = new();
    private readonly BulkInquiryStatusValidator _bulk = new();

    [Fact]
    public void Default_Query_Is_Valid()
    {
        Assert.True(_query.Validate(new ContactInquiryQuery()).IsValid);
    }

    [Theory]
    [InlineData(10)]
    [InlineData(20)]
    [InlineData(30)]
    [InlineData(50)]
    public void Allowed_Page_Sizes_Are_Valid(int pageSize)
    {
        Assert.True(_query.Validate(new ContactInquiryQuery { PageSize = pageSize }).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    [InlineData(15)]
    [InlineData(100)]
    [InlineData(100000)]
    public void Other_Page_Sizes_Are_Rejected(int pageSize)
    {
        Assert.False(_query.Validate(new ContactInquiryQuery { PageSize = pageSize }).IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void Page_Must_Be_One_Or_Higher(int page)
    {
        Assert.False(_query.Validate(new ContactInquiryQuery { Page = page }).IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("unread")]
    [InlineData("READ")]
    [InlineData("replied")]
    [InlineData("archived")]
    public void Known_Statuses_Are_Valid(string? status)
    {
        Assert.True(_query.Validate(new ContactInquiryQuery { Status = status }).IsValid);
    }

    [Theory]
    [InlineData("starred")]
    [InlineData("all")]
    [InlineData("deleted")]
    public void Unknown_Statuses_Are_Rejected(string status)
    {
        Assert.False(_query.Validate(new ContactInquiryQuery { Status = status }).IsValid);
    }

    [Theory]
    [InlineData("contact", true)]
    [InlineData("repo_request", true)]
    [InlineData("", true)]
    [InlineData("spam", false)]
    public void Types_Are_Checked(string type, bool valid)
    {
        Assert.Equal(valid, _query.Validate(new ContactInquiryQuery { Type = type }).IsValid);
    }

    [Fact]
    public void Search_Is_Limited_To_100_Characters()
    {
        Assert.True(_query.Validate(new ContactInquiryQuery { Search = new string('a', 100) }).IsValid);
        Assert.False(_query.Validate(new ContactInquiryQuery { Search = new string('a', 101) }).IsValid);
    }

    [Fact]
    public void From_Must_Not_Be_After_To()
    {
        var now = DateTimeOffset.UtcNow;

        Assert.True(_query.Validate(new ContactInquiryQuery { From = now.AddDays(-1), To = now }).IsValid);
        Assert.True(_query.Validate(new ContactInquiryQuery { From = now }).IsValid);

        var result = _query.Validate(new ContactInquiryQuery { From = now, To = now.AddDays(-1) });
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "From");
    }

    [Fact]
    public void Bulk_Update_Needs_Ids_And_A_Known_Status()
    {
        var id = Guid.NewGuid();

        Assert.True(_bulk.Validate(new BulkInquiryStatusDto { Ids = { id }, Status = ContactInquiryStatuses.Archived }).IsValid);
        Assert.False(_bulk.Validate(new BulkInquiryStatusDto { Status = ContactInquiryStatuses.Read }).IsValid);
        Assert.False(_bulk.Validate(new BulkInquiryStatusDto { Ids = { id }, Status = "starred" }).IsValid);
    }

    [Fact]
    public void Bulk_Update_Is_Limited_To_100_Messages()
    {
        var ids = Enumerable.Range(0, BulkInquiryStatusValidator.MaxIds + 1).Select(_ => Guid.NewGuid()).ToList();

        Assert.False(_bulk.Validate(new BulkInquiryStatusDto { Ids = ids, Status = ContactInquiryStatuses.Read }).IsValid);
        Assert.True(_bulk.Validate(new BulkInquiryStatusDto { Ids = ids.Take(BulkInquiryStatusValidator.MaxIds).ToList(), Status = ContactInquiryStatuses.Read }).IsValid);
    }
}
