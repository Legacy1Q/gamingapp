namespace GamingApp.api.Models;

public class Game
{
    public int Id { get; set; }

    public string Title { get; set; } = "";

    public string Genre { get; set; } = "";

    public string Description { get; set; } = "";

    public string DeveloperName { get; set; } = "";

    public string ThumbnailUrl { get; set; } = "";

    public string PlayUrl { get; set; } = "";

    public bool IsPublished { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}