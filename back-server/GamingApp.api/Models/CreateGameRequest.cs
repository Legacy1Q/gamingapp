namespace GamingApp.api.Models
{
    public record CreateGameRequest(
        string Title,
        string Genre
    );
}