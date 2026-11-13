namespace Portfolio.API.Features.Contact;

public interface IContactService
{
    Task<ContactInquiryDto> SubmitInquiryAsync(ContactRequestDto dto, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a repo access request for a private project and sends the emails. The caller has already
    /// checked that the project exists, is published and is private.
    /// </summary>
    Task<ContactInquiryDto> SubmitRepoRequestAsync(Guid projectId, string projectTitle, RepoAccessRequestDto dto, CancellationToken cancellationToken = default);

    Task<List<ContactInquiryDto>> GetInquiriesAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<bool> UpdateInquiryStatusAsync(Guid id, string status, CancellationToken cancellationToken = default);
}
