namespace Portfolio.API.Features.Contact;

public interface IContactService
{
    Task<ContactInquiryDto> SubmitInquiryAsync(ContactRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<ContactInquiryDto>> GetInquiriesAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<bool> UpdateInquiryStatusAsync(Guid id, string status, CancellationToken cancellationToken = default);
}
