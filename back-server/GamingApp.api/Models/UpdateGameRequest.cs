namespace GamingApp.api.Models;

public record UpdateGameRequest(
    string Title, 
    string Genre,
    string Description,
    string DeveloperName,
    string PlayUrl
    );