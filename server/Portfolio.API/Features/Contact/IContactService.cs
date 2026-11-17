namespace Portfolio.API.Features.Contact;

public interface IContactService
{
    Task<ContactInquiryDto> SubmitInquiryAsync(ContactRequestDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a repo access request for a private project and sends the emails. The caller has already
    /// checked that the project exists, is published and is private.
    /// </summary>
    Task<ContactInquiryDto> SubmitRepoRequestAsync(Guid projectId, string projectTitle, RepoAccessRequestDto dto, CancellationToken cancellationToken = default);

    /// <summary>One page of the admin inbox, filtered and searched. The query must already be validated.</summary>
    Task<ContactInquiryPage> GetInquiriesAsync(ContactInquiryQuery query, CancellationToken cancellationToken = default);

    Task<bool> UpdateInquiryStatusAsync(Guid id, string status, CancellationToken cancellationToken = default);

    /// <summary>Sets the same status on several messages. Returns how many were updated.</summary>
    Task<int> BulkUpdateInquiryStatusAsync(IReadOnlyCollection<Guid> ids, string status, CancellationToken cancellationToken = default);
}
