using System.ComponentModel.DataAnnotations;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;

namespace GamingApp.api.Auth;

public static class PasswordRecovery
{
    public static void AddPasswordRecovery(this IServiceCollection services)
    {
        services.AddSingleton<RecoveryMailQueue>();
        services.AddHostedService<RecoveryMailSender>();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("recovery", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(15), QueueLimit = 0 }));
        });
    }

    public static void MapPasswordRecovery(this RouteGroupBuilder auth)
    {
        auth.MapPost("/forgot-password", async (ForgotRequest request, UserManager<IdentityUser> users,
            RecoveryMailQueue queue, IConfiguration config, IHostEnvironment environment) =>
        {
            var email = request.Email?.Trim();
            if (!string.IsNullOrEmpty(email) && email.Length <= 256 && new EmailAddressAttribute().IsValid(email))
            {
                var user = await users.FindByEmailAsync(email);
                if (user != null)
                {
                    var token = await users.GeneratePasswordResetTokenAsync(user);
                    // Use configured frontend origin, never an untrusted Host header.
                    var origin = config["Recovery:FrontendUrl"] ?? (environment.IsDevelopment() ? "http://localhost:5173" : "");
                    if (Uri.TryCreate(origin, UriKind.Absolute, out var frontend)
                        && (frontend.Scheme == "https" || environment.IsDevelopment() && frontend.IsLoopback && frontend.Scheme == "http"))
                    {
                        var link = new Uri(frontend, "/reset-password").AbsoluteUri + "#userId=" + Uri.EscapeDataString(user.Id) + "&token=" + Uri.EscapeDataString(token);
                        queue.Messages.Writer.TryWrite(new RecoveryMail(user.Email!, link));
                    }
                }
            }
            return Results.Ok(new { message = "If an account matches that email, you’ll receive a password reset link." });
        }).RequireRateLimiting("recovery");

        auth.MapPost("/reset-password", async (ResetRequest request, UserManager<IdentityUser> users,
            SignInManager<IdentityUser> signIn) =>
        {
            const string invalid = "This reset link is invalid or expired, or the password does not meet the requirements. Request a new link or check your password.";
            if (string.IsNullOrWhiteSpace(request.UserId) || request.UserId.Length > 450
                || string.IsNullOrEmpty(request.Token) || request.Token.Length > 4096
                || string.IsNullOrEmpty(request.Password) || request.Password.Length is < 10 or > 128)
                return Results.BadRequest(new { message = invalid });
            var user = await users.FindByIdAsync(request.UserId);
            if (user == null) return Results.BadRequest(new { message = invalid });
            var result = await users.ResetPasswordAsync(user, request.Token, request.Password);
            if (!result.Succeeded) return Results.BadRequest(new { message = invalid });
            // A recovered account should not remain locked by earlier failed attempts.
            await users.SetLockoutEndDateAsync(user, null);
            await users.ResetAccessFailedCountAsync(user);
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).RequireRateLimiting("recovery");
    }

    public record ForgotRequest(string? Email);
    public record ResetRequest(string? UserId, string? Token, string? Password);
}

public record RecoveryMail(string Recipient, string Link);
public class RecoveryMailQueue
{
    public Channel<RecoveryMail> Messages { get; } = Channel.CreateBounded<RecoveryMail>(100);
}

public class RecoveryMailSender(RecoveryMailQueue queue, IConfiguration config,
    IWebHostEnvironment environment, ILogger<RecoveryMailSender> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var mail in queue.Messages.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                var body = $"Reset your GameHub password using this link:\n\n{mail.Link}\n\nThis link expires in one hour and can be used once. If you did not request this, ignore this message.";
                if (environment.IsDevelopment() && config["Recovery:Delivery"] != "Smtp")
                {
                    var folder = Path.GetFullPath(config["Recovery:PreviewDirectory"]
                        ?? Path.Combine(environment.ContentRootPath, "..", "..", ".local", "recovery-mail"));
                    Directory.CreateDirectory(folder);
                    await File.WriteAllTextAsync(Path.Combine(folder, $"{Guid.NewGuid()}.txt"),
                        $"To: {mail.Recipient}\nSubject: Reset your GameHub password\n\n{body}", stoppingToken);
                }
                else
                {
                    using var smtp = new SmtpClient(config["Recovery:Smtp:Host"] ?? throw new InvalidOperationException("SMTP host missing"),
                        config.GetValue("Recovery:Smtp:Port", 587));
                    smtp.EnableSsl = true;
                    smtp.Credentials = new NetworkCredential(config["Recovery:Smtp:Username"], config["Recovery:Smtp:Password"]);
                    using var message = new MailMessage(config["Recovery:Smtp:From"] ?? throw new InvalidOperationException("Sender missing"), mail.Recipient,
                        "Reset your GameHub password", body);
                    await smtp.SendMailAsync(message, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception)
            {
                // Never log email bodies, tokens, or provider credentials.
                logger.LogError("Password reset delivery failed. Check recovery email configuration.");
            }
        }
    }
}
