namespace Portfolio.API.Infrastructure.Querying;

public static class LikeEscaper
{
    /// <summary>Escapes the characters that mean something in a LIKE pattern, so a search for "50%" finds "50%".</summary>
    public static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
