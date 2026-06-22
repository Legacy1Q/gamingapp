using GamingApp.api.Models;
using GamingApp.api.Data;
using Microsoft.EntityFrameworkCore;
<<<<<<< HEAD
using Microsoft.AspNetCore.StaticFiles;
using System.IO.Compression;
using System.Text.RegularExpressions;
=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=GamingAppDb.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowReactApp");

<<<<<<< HEAD
app.UseDefaultFiles();

var provider = new FileExtensionContentTypeProvider();

provider.Mappings[".data"] = "application/octet-stream";
provider.Mappings[".wasm"] = "application/wasm";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});

=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

<<<<<<< HEAD

=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
app.MapGet("/games", async (AppDbContext db) =>
{
    return await db.Games.ToListAsync();
});


app.MapGet("/games/{id}", async (int id, AppDbContext db) =>
{
    var game = await db.Games.FindAsync(id);

    return game is not null
        ? Results.Ok(game)
        : Results.NotFound();
});


app.MapPost("/games", async (CreateGameRequest request, AppDbContext db) =>
{
    var newGame = new Game
    {
        Title = request.Title,
        Genre = request.Genre,
        Description = request.Description,
        DeveloperName = request.DeveloperName,
        CreatedAt = DateTime.UtcNow,
<<<<<<< HEAD
        IsPublished = false,
        PlayUrl = request.PlayUrl
=======
        IsPublished = false
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
    };

    db.Games.Add(newGame);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/games/{newGame.Id}",
        newGame
    );
});

<<<<<<< HEAD
app.MapPost("/games/{id}/upload", async (int id, IFormFile file, AppDbContext db, IWebHostEnvironment env) =>
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

=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
app.MapPut("/games/{id}", async (int id, UpdateGameRequest request, AppDbContext db) =>
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
<<<<<<< HEAD
    game.PlayUrl = request.PlayUrl;
=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
    await db.SaveChangesAsync();

    return Results.Ok(game);
});


app.MapDelete("/games/{id}", async (int id, AppDbContext db) =>
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

app.Run();