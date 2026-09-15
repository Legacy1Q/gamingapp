using System.ComponentModel.DataAnnotations;

namespace GamingApp.api.Models;

public class GameReview
{
    public int Id { get; set; }
    public int GameId { get; set; }
    public string AuthorId { get; set; } = "";
    public int Rating { get; set; }
    [MaxLength(2000)]
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
