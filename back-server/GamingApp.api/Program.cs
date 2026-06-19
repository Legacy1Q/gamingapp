using GamingApp.api.Models;
using GamingApp.api.Data;
using Microsoft.EntityFrameworkCore;


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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

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
        IsPublished = false
    };

    db.Games.Add(newGame);
    await db.SaveChangesAsync();

    return Results.Created(
        $"/games/{newGame.Id}",
        newGame
    );
});

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