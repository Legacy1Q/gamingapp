using System.ComponentModel.DataAnnotations;
using GamingApp.api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using GamingApp.api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using System.Text.RegularExpressions;

namespace GamingApp.api.Auth;

public static class PlayerAccounts
{
    public static IServiceCollection AddPlayerAccounts(this IServiceCollection services, IHostEnvironment environment)
    {
        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
        services.AddAuthorization();
        services.AddIdentityCore<IdentityUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = 10;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        }).AddEntityFrameworkStores<AppDbContext>().AddSignInManager().AddDefaultTokenProviders();
        services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(1));
        // Check changed security stamps on every request so reset passwords revoke old cookies.
        services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.Name = "GameHub.Auth";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        });
        return services;
    }

    public static void MapPlayerAccounts(this WebApplication app)
    {
        var auth = app.MapGroup("/auth");
        // JSON endpoints must explicitly validate the token on state-changing requests.
        auth.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            if (HttpMethods.IsPost(context.HttpContext.Request.Method))
            {
                var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
                if (!await antiforgery.IsRequestValidAsync(context.HttpContext))
                    return Results.BadRequest(new { message = "Invalid request token. Refresh and try again." });
            }
            return await next(context);
        });

        auth.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
            Results.Ok(new { token = antiforgery.GetAndStoreTokens(context).RequestToken }));
        auth.MapPasswordRecovery();

        auth.MapPost("/register", async (Credentials request, UserManager<IdentityUser> users) =>
        {
            var email = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email) || !new EmailAddressAttribute().IsValid(email)
                || email.Length > 256 || string.IsNullOrEmpty(request.Password) || request.Password.Length > 128)
                return Results.BadRequest(new { message = "Enter a valid email and a password of 10–128 characters." });

            var result = await users.CreateAsync(new IdentityUser { UserName = email, Email = email }, request.Password);
            if (!result.Succeeded)
                return Results.BadRequest(new { errors = result.Errors.Select(error => error.Description) });
            return Results.StatusCode(StatusCodes.Status201Created);
        });

        auth.MapPost("/login", async (Credentials request, SignInManager<IdentityUser> signIn) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Length > 256
                || string.IsNullOrEmpty(request.Password) || request.Password.Length > 128)
                return Results.Unauthorized();
            var result = await signIn.PasswordSignInAsync(request.Email.Trim(), request.Password,
                isPersistent: false, lockoutOnFailure: true);
            return result.Succeeded ? Results.NoContent() : Results.Unauthorized();
        });

        auth.MapGet("/me", async (HttpContext context, UserManager<IdentityUser> users, AppDbContext db, IConfiguration config) =>
        {
            var user = await users.GetUserAsync(context.User);
            if (user is null) return Results.Unauthorized();
            var profile = await db.PlayerProfiles.FindAsync(user.Id);
            return Results.Ok(new { user.Id, user.Email,
                DisplayName = profile?.DisplayName ?? PlayerProfile.DefaultName(user.Id),
                HasDisplayName = profile != null, IsOwner = user.Id == config["Owner:UserId"] });
        }).RequireAuthorization();

        auth.MapPost("/profile", async (ProfileRequest request, HttpContext context, UserManager<IdentityUser> users, AppDbContext db) =>
        {
            var user = await users.GetUserAsync(context.User);
            if (user is null) return Results.Unauthorized();
            var name = request.DisplayName?.Trim();
            if (name is null || !Regex.IsMatch(name, @"\A[A-Za-z0-9 _-]{3,30}\z")
                || Regex.IsMatch(name, @"\APlayer [A-Fa-f0-9]{8}\z", RegexOptions.IgnoreCase))
                return Results.BadRequest(new { message = "Use 3–30 letters (A–Z), numbers, spaces, underscores or hyphens. Automatic Player labels are reserved." });
            var normalized = name.ToUpperInvariant();
            if (await db.PlayerProfiles.AnyAsync(p => p.NormalizedName == normalized && p.UserId != user.Id))
                return Results.Conflict(new { message = "That display name is already taken." });
            var profile = await db.PlayerProfiles.FindAsync(user.Id);
            if (profile is null) { profile = new PlayerProfile { UserId = user.Id }; db.PlayerProfiles.Add(profile); }
            profile.DisplayName = name;
            profile.NormalizedName = normalized;
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException error) when (error.InnerException is SqliteException { SqliteErrorCode: 19 })
            { return Results.Conflict(new { message = "That display name is already taken. Please try again." }); }
            return Results.NoContent();
        }).RequireAuthorization();

        auth.MapPost("/logout", async (SignInManager<IdentityUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }

    public record Credentials(string? Email, string? Password);
    public record ProfileRequest(string? DisplayName);
}
