namespace GamingApp.api.Models
{
    public record CreateGameRequest(
        string Title,
        string Genre,
        string Description,

        string DeveloperName,
        string PlayUrl
    );
}