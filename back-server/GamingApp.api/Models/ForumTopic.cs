namespace GamingApp.api.Models;

public class ForumTopic
{
    public int Id { get; set; }
    public string AuthorId { get; set; } = "";
    public string Category { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<ForumReply> Replies { get; set; } = [];
    public DateTime? UpdatedAt { get; set; }
}

public class ForumReply
{
    public DateTime? UpdatedAt { get; set; }
    public int Id { get; set; }
    public int ForumTopicId { get; set; }
    public string AuthorId { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
