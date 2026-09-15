using System.ComponentModel.DataAnnotations;

namespace GamingApp.api.Models;

// One current run and one personal best per player for Z-Dasher.
public class LeaderboardRun
{
    [Key] public string UserId { get; set; } = "";
    public string RunId { get; set; } = "";
    public DateTime StartedAt { get; set; }
    public int Deliveries { get; set; }
    public string Status { get; set; } = "Active";
    public long? ElapsedMilliseconds { get; set; }
}

public class LeaderboardBest
{
    [Key] public string UserId { get; set; } = "";
    public long ElapsedMilliseconds { get; set; }
    public DateTime CompletedAt { get; set; }
}
