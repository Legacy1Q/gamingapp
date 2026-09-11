using System.ComponentModel.DataAnnotations;
using GamingApp.api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;

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
        }).AddEntityFrameworkStores<AppDbContext>().AddSignInManager();

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

        auth.MapGet("/me", async (HttpContext context, UserManager<IdentityUser> users) =>
        {
            var user = await users.GetUserAsync(context.User);
            return user is null ? Results.Unauthorized() : Results.Ok(new { user.Id, user.Email });
        }).RequireAuthorization();

        auth.MapPost("/logout", async (SignInManager<IdentityUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }

    public record Credentials(string? Email, string? Password);
}
