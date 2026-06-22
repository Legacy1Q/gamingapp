using GamingApp.api.Models;
using Microsoft.EntityFrameworkCore;

namespace GamingApp.api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Game> Games { get; set; }
}