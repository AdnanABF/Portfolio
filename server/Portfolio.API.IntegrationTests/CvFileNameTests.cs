using System.Globalization;
using Portfolio.API.Features.Media;

namespace Portfolio.API.IntegrationTests;

/// <summary>The CV's file name must be the same on every machine, whatever calendar or language it is set to.</summary>
public class CvFileNameTests
{
    [Fact]
    public void The_Name_Uses_The_Gregorian_Date_Whatever_The_Machines_Culture()
    {
        var uploadedAt = new DateTimeOffset(2026, 11, 17, 1, 30, 0, TimeSpan.FromHours(3));

        // Cultures that use another calendar (Arabic-Saudi: Hijri, Thai: Buddhist) would change the year and month.
        foreach (var name in new[] { "en-US", "ar-SA", "th-TH", "fa-IR" })
        {
            CultureInfo culture;
            try
            {
                culture = new CultureInfo(name);
            }
            catch (CultureNotFoundException)
            {
                continue; // This machine has no culture data for it (invariant mode); nothing to check here.
            }

            var previous = CultureInfo.CurrentCulture;
            try
            {
                CultureInfo.CurrentCulture = culture;
                Assert.Equal("Adnan CV 2026-11-17.pdf", MediaService.CvFileName(uploadedAt, ".pdf"));
            }
            finally
            {
                CultureInfo.CurrentCulture = previous;
            }
        }
    }
}
