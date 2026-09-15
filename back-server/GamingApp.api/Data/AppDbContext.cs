using GamingApp.api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace GamingApp.api.Data;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Game> Games { get; set; }
    public DbSet<LeaderboardRun> LeaderboardRuns { get; set; }
    public DbSet<LeaderboardBest> LeaderboardBests { get; set; }
    public DbSet<ForumReport> ForumReports { get; set; }
    public DbSet<GameReview> GameReviews { get; set; }
    public DbSet<PlayerProfile> PlayerProfiles { get; set; }
    public DbSet<ForumTopic> ForumTopics { get; set; }
    public DbSet<ForumReply> ForumReplies { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<LeaderboardRun>().HasOne<IdentityUser>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<LeaderboardBest>().HasOne<IdentityUser>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<LeaderboardBest>().HasIndex(r => r.ElapsedMilliseconds);
        builder.Entity<ForumReport>().HasIndex(r => new { r.ReporterId, r.Kind, r.TargetId }).IsUnique();
        builder.Entity<ForumReport>().HasOne<IdentityUser>().WithMany().HasForeignKey(r => r.ReporterId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<GameReview>().HasIndex(r => new { r.GameId, r.AuthorId }).IsUnique();
        builder.Entity<GameReview>().HasOne<Game>().WithMany().HasForeignKey(r => r.GameId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<GameReview>().HasOne<IdentityUser>().WithMany().HasForeignKey(r => r.AuthorId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<GameReview>().ToTable(t => t.HasCheckConstraint("CK_GameReview_Rating", "Rating BETWEEN 1 AND 5"));
        builder.Entity<PlayerProfile>().HasIndex(p => p.NormalizedName).IsUnique();
        builder.Entity<PlayerProfile>().HasOne<IdentityUser>().WithOne()
            .HasForeignKey<PlayerProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<ForumTopic>().HasOne<IdentityUser>().WithMany()
            .HasForeignKey(topic => topic.AuthorId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ForumReply>().HasOne<IdentityUser>().WithMany()
            .HasForeignKey(reply => reply.AuthorId).OnDelete(DeleteBehavior.Restrict);
    }
}
