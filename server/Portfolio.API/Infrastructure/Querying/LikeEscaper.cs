namespace Portfolio.API.Infrastructure.Querying;

public static class LikeEscaper
{
    /// <summary>
    /// The escape character used in LIKE patterns. It must be passed to <c>EF.Functions.ILike</c> as well:
    /// without it the database does not treat the backslashes added by <see cref="Escape"/> as escapes,
    /// and a search for "50%" or "a_b" would not find the text.
    /// </summary>
    public const string EscapeCharacter = "\\";

    /// <summary>Escapes the characters that mean something in a LIKE pattern, so a search for "50%" finds "50%".</summary>
    public static string Escape(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
