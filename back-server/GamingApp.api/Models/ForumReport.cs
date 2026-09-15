using System.ComponentModel.DataAnnotations;

namespace GamingApp.api.Models;

public class ForumReport
{
    public int Id { get; set; }
    public string ReporterId { get; set; } = "";
    public string Kind { get; set; } = "";
    public int TargetId { get; set; }
    public int TopicId { get; set; }
    [MaxLength(1000)] public string Reason { get; set; } = "";
    // Keep the reported text even if the author edits or deletes the post.
    public string TitleSnapshot { get; set; } = "";
    public string BodySnapshot { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public string? Resolution { get; set; }
}
