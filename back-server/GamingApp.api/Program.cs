using GamingApp.api.Models;
using GamingApp.api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.StaticFiles;
using System.IO.Compression;
using System.Text.RegularExpressions;
using GamingApp.api.Auth;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using GamingApp.api.Forum;
using GamingApp.api.Reviews;
using GamingApp.api.Leaderboards;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net;


var builder = WebApplication.CreateBuilder(args);
var serveFrontend = builder.Configuration.GetValue<bool>("Hosting:ServeFrontend");
var ephemeralPreview = builder.Configuration.GetValue<bool>("Preview:Ephemeral");

var frontendOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment() ? ["http://localhost:5173"] : []);
foreach (var origin in frontendOrigins)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)
        || uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment)
        || !string.IsNullOrEmpty(uri.UserInfo) || origin.EndsWith('/')
        || (uri.Scheme != "https" && !(builder.Environment.IsDevelopment() && uri.IsLoopback && uri.Scheme == "http")))
        throw new InvalidOperationException("Cors:AllowedOrigins must contain HTTPS origins without paths or trailing slashes.");
}

var keyPath = builder.Configuration["DataProtection:KeysPath"];
if (!builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(keyPath))
    throw new InvalidOperationException("Set DataProtection:KeysPath to a private persistent directory before running in production.");
var protection = builder.Services.AddDataProtection().SetApplicationName("GamesHQ");
if (!string.IsNullOrWhiteSpace(keyPath))
    protection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var address in builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [])
        options.KnownProxies.Add(IPAddress.Parse(address));
});
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=GamingAppDb.db"));

builder.Services.AddPlayerAccounts(builder.Environment);
builder.Services.AddPasswordRecovery();
builder.Services.AddAuthorization(options => options.AddPolicy("Owner", policy =>
    policy.RequireAuthenticatedUser().RequireAssertion(context =>
    {
        var ownerId = builder.Configuration["Owner:UserId"];
        return !string.IsNullOrWhiteSpace(ownerId)
            && context.User.FindFirstValue(ClaimTypes.NameIdentifier) == ownerId;
    })));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        if (frontendOrigins.Length > 0) policy.WithOrigins(frontendOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseForwardedHeaders();
if (builder.Configuration.GetValue<bool>("Hosting:EdgeHttps"))
{
    // Explicit TLS-offload deployment contract: only enable behind an HTTPS-only edge.
    // Do not trust arbitrary incoming forwarded headers to make this decision.
    app.Use((context, next) => { context.Request.Scheme = "https"; return next(context); });
}
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
    app.UseHsts();
}
// Render terminates TLS at its edge. Other hosts retain app-level redirection.
if (!builder.Configuration.GetValue<bool>("Hosting:EdgeHttps")) app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseAntiforgery();
app.MapPlayerAccounts();
app.MapForum();
app.MapReviews();
app.MapLeaderboards();

// All game mutations share the owner policy and explicit JSON CSRF validation.
var management = app.MapGroup("/games").RequireAuthorization("Owner");
management.AddEndpointFilter(async (context, next) =>
{
    var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
    if (!await antiforgery.IsRequestValidAsync(context.HttpContext))
        return Results.BadRequest(new { message = "Invalid request token. Refresh and try again." });
    return await next(context);
});

app.UseDefaultFiles();

// Check the cookie BEFORE static files can send a Unity build to the browser.
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var gameFiles = (path.StartsWithSegments("/games", out var remaining) && remaining.HasValue)
        || path.StartsWithSegments("/play");
    if (serveFrontend && path == "/games/z-dasher") gameFiles = false;
    if (gameFiles)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (context.User.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { message = "Log in to play this game." });
            return;
        }
    }
    await next();
});

var provider = new FileExtensionContentTypeProvider();

provider.Mappings[".data"] = "application/octet-stream";
provider.Mappings[".wasm"] = "application/wasm";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapHealthChecks("/health");


app.MapGet("/catalog", async (AppDbContext db) =>
{
    return await db.Games.ToListAsync();
});


app.MapGet("/catalog/{id:int}", async (int id, AppDbContext db) =>
{
    var game = await db.Games.FindAsync(id);

    return game is not null
        ? Results.Ok(game)
        : Results.NotFound();
});


management.MapPost("", async (CreateGameRequest request, AppDbContext db) =>
{
    var newGame = new Game
    {
        Title = request.Title,
        Genre = request.Genre,
        Description = request.Description,
        DeveloperName = request.DeveloperName,
        CreatedAt = DateTime.UtcNow,
    };

    db.Games.Add(newGame);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/games/{newGame.Id}",
        newGame
    );
});


management.MapPost("/{id:int}/upload", async (int id, IFormFile file, AppDbContext db, IWebHostEnvironment env) =>
{
    var game = await db.Games.FindAsync(id);

    if (game is null)
    {
        return Results.NotFound("Game not found.");
    }

    if (file is null || file.Length == 0)
    {
        return Results.BadRequest("No file uploaded.");
    }

    if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest("Only .zip files are allowed.");
    }

    var slug = Regex.Replace(game.Title.ToLower(), @"[^a-z0-9]+", "-").Trim('-');

    var gameFolder = Path.Combine(env.WebRootPath, "play", slug);

    if (Directory.Exists(gameFolder))
    {
        Directory.Delete(gameFolder, true);
    }

    Directory.CreateDirectory(gameFolder);

    var zipPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.zip");

    await using (var stream = File.Create(zipPath))
    {
        await file.CopyToAsync(stream);
    }

    ZipFile.ExtractToDirectory(zipPath, gameFolder);

    File.Delete(zipPath);

    var indexPath = Path.Combine(gameFolder, "index.html");

    if (!File.Exists(indexPath))
    {
        return Results.BadRequest("Upload must contain index.html at the root of the zip.");
    }

    game.PlayUrl = $"/play/{slug}/index.html";

    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        message = "Game uploaded successfully.",
        game.Id,
        game.Title,
        game.PlayUrl
    });
});

management.MapPut("/{id:int}", async (int id, UpdateGameRequest request, AppDbContext db) =>
{
    var game = await db.Games.FindAsync(id);

    if (game is null)
    {
        return Results.NotFound();
    }

    game.Title = request.Title;
    game.Genre = request.Genre;
    game.Description = request.Description;
    game.DeveloperName = request.DeveloperName;
    await db.SaveChangesAsync();

    return Results.Ok(game);
});


management.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
{
    var game = await db.Games.FindAsync(id);

    if (game is null)
    {
        return Results.NotFound();
    }

    db.Games.Remove(game);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

if (serveFrontend)
{
    // Explicit frontend routes keep missing API and game files as real 404s.
    foreach (var route in new[] { "/games", "/games/z-dasher", "/login", "/register", "/profile",
        "/forgot-password", "/reset-password", "/leaderboard", "/community", "/community/reports",
        "/about", "/contact", "/support", "/community/{id:int}" })
        app.MapGet(route, (IWebHostEnvironment env) => Results.File(Path.Combine(env.WebRootPath, "index.html"), "text/html"));
}
else
{
    // Preserve the original read URLs for local clients and existing integrations.
    app.MapGet("/games", async (AppDbContext db) => await db.Games.ToListAsync());
    app.MapGet("/games/{id:int}", async (int id, AppDbContext db) =>
        await db.Games.FindAsync(id) is Game game ? Results.Ok(game) : Results.NotFound());
}

if (ephemeralPreview)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (!await db.Games.AnyAsync())
    {
        db.Games.Add(new Game { Title = "Z-Dasher", Genre = "Zombie survival", DeveloperName = "Mike Sims",
            Description = "A delivery zombie survival game.", IsPublished = true,
            PlayUrl = "/games/z-dasher/index.html", CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
    }
    app.Logger.LogWarning("Temporary preview: accounts, posts, scores and authentication keys may be lost on restart. Email recovery is disabled.");
}

app.Run();

