namespace Portfolio.API.Infrastructure.Email;

public static class EmailServiceCollectionExtensions
{
    /// <summary>
    /// Registers email sending. Outside Development the Resend settings are required and the app
    /// refuses to start without them, so a missing key can never silently turn emails off.
    /// In Development, with no API key, emails are written to the log instead of being sent.
    /// </summary>
    public static IServiceCollection AddEmailSending(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var section = configuration.GetSection(ResendOptions.SectionName);
        services.Configure<ResendOptions>(section);

        var options = section.Get<ResendOptions>() ?? new ResendOptions();
        var hasKey = !string.IsNullOrWhiteSpace(options.ApiKey);

        if (!environment.IsDevelopment())
        {
            var missing = new List<string>();
            if (!hasKey) missing.Add("Resend:ApiKey");
            if (string.IsNullOrWhiteSpace(options.FromAddress)) missing.Add("Resend:FromAddress");
            if (string.IsNullOrWhiteSpace(options.NotifyFromAddress)) missing.Add("Resend:NotifyFromAddress");
            if (string.IsNullOrWhiteSpace(options.OwnerEmail)) missing.Add("Resend:OwnerEmail");

            if (missing.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Email settings are missing: {string.Join(", ", missing)}. " +
                    "Set them as environment variables (for example Resend__ApiKey).");
            }
        }

        if (hasKey)
        {
            services.AddHttpClient<IEmailSender, ResendEmailSender>(client =>
            {
                client.BaseAddress = new Uri("https://api.resend.com/");
                client.Timeout = TimeSpan.FromSeconds(10);
            });
        }
        else
        {
            services.AddSingleton<IEmailSender, LoggingEmailSender>();
        }

        return services;
    }
}
