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
    public DbSet<ForumTopic> ForumTopics { get; set; }
    public DbSet<ForumReply> ForumReplies { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<ForumTopic>().HasOne<IdentityUser>().WithMany()
            .HasForeignKey(topic => topic.AuthorId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ForumReply>().HasOne<IdentityUser>().WithMany()
            .HasForeignKey(reply => reply.AuthorId).OnDelete(DeleteBehavior.Restrict);
    }
}
