using GamingApp.api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var games = new List<Game> //new[] = fixed size array, List<> = dynamic size array
{
    new Game(1, "My FPS Game", "Micro FPS"),
    new Game(2, "Z-Dasher", "a survival delivery game"),
};

app.MapGet("/games", () => games);


app.MapGet("/games/{id}", (int id) =>
{
    return games.FirstOrDefault(g => g.Id == id);
});


app.MapPost("/games", (CreateGameRequest request) =>
{
    var newGame = new Game(
        games.Count + 1,
        request.Title,
        request.Genre
    );

    games.Add(newGame);

    return Results.Created(
        $"/games/{newGame.Id}",
        newGame
    );
});

app.Run();