namespace Portfolio.API.Features.Homepage;

/// <summary>The ids of a list in their new display order.</summary>
public class ReorderDto
{
    public List<Guid> Ids { get; set; } = new();
}
