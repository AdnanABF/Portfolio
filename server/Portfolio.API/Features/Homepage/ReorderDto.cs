namespace Portfolio.API.Features.Homepage;

/// <summary>The ids of a list in their new display order.</summary>
public class ReorderDto
{
    public List<Guid> Ids { get; set; } = new();
}

public static class ReorderHelper
{
    /// <summary>
    /// Numbers every row: the listed ids first in the given order, then any row not listed, keeping its current
    /// relative order. A partial list therefore never leaves two rows with the same number.
    /// Returns false when an id matches no row.
    /// </summary>
    public static bool Apply<T>(IEnumerable<T> all, IReadOnlyList<Guid> orderedIds, Func<T, Guid> id, Func<T, int> current, Action<T, int> set)
    {
        var rows = all.ToDictionary(id);
        var listed = orderedIds.Distinct().ToList();
        if (listed.Any(i => !rows.ContainsKey(i))) return false;

        var order = listed.Select(i => rows[i])
            .Concat(rows.Values.Where(r => !listed.Contains(id(r))).OrderBy(current));
        var n = 0;
        foreach (var row in order) set(row, n++);
        return true;
    }
}
