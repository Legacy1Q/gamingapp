using System.Security.Claims;
using GamingApp.api.Data;
using GamingApp.api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace GamingApp.api.Leaderboards;

public static class LeaderboardEndpoints
{
    public const int RequiredDeliveries = 5;
    public static void MapLeaderboards(this WebApplication app)
    {
        var board = app.MapGroup("/leaderboards/z-dasher").RequireAuthorization();
        board.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            if (!HttpMethods.IsGet(context.HttpContext.Request.Method)
                && !await context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>().IsRequestValidAsync(context.HttpContext))
                return Results.BadRequest(new { message = "Refresh and log in again before starting a ranked run." });
            return await next(context);
        });

        board.MapGet("", async (int? page, AppDbContext db, HttpContext context) =>
        {
            var number = Math.Clamp(page ?? 1, 1, 10000);
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var rows = await db.LeaderboardBests.AsNoTracking().OrderBy(r => r.ElapsedMilliseconds).ThenBy(r => r.CompletedAt).ThenBy(r => r.UserId)
                .Skip((number - 1) * 20).Take(20)
                .Select(r => new { r.UserId, r.ElapsedMilliseconds, r.CompletedAt, Rank = 1 + db.LeaderboardBests.Count(b => b.ElapsedMilliseconds < r.ElapsedMilliseconds) }).ToListAsync();
            var ids = rows.Select(r => r.UserId).ToArray();
            var names = await db.PlayerProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId, p => p.DisplayName);
            var mine = await db.LeaderboardBests.FindAsync(userId);
            var myRank = mine == null ? (int?)null : 1 + await db.LeaderboardBests.CountAsync(r => r.ElapsedMilliseconds < mine.ElapsedMilliseconds);
            return Results.Ok(new { total = await db.LeaderboardBests.CountAsync(), page = number, requiredDeliveries = RequiredDeliveries,
                personalBest = mine == null ? null : new { mine.ElapsedMilliseconds, Rank = myRank },
                items = rows.Select(r => new { r.Rank, r.ElapsedMilliseconds, r.CompletedAt, IsYou = r.UserId == userId,
                    Name = names.GetValueOrDefault(r.UserId) ?? PlayerProfile.DefaultName(r.UserId) }) });
        });

        board.MapPost("/start", async (StartRequest request, AppDbContext db, HttpContext context) =>
        {
            if (request.TotalDeliveries != RequiredDeliveries) return Results.BadRequest(new { message = "This build is not eligible for this leaderboard." });
            await using var transaction = await db.Database.BeginTransactionAsync();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var run = await db.LeaderboardRuns.FindAsync(userId);
            if (run == null) { run = new LeaderboardRun { UserId = userId }; db.LeaderboardRuns.Add(run); }
            run.RunId = Guid.NewGuid().ToString("N"); run.StartedAt = DateTime.UtcNow;
            run.Deliveries = 0; run.Status = "Active"; run.ElapsedMilliseconds = null;
            await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.Ok(new { run.RunId, requiredDeliveries = RequiredDeliveries });
        });

        board.MapPost("/runs/{runId}/event", async (string runId, RunEvent request, AppDbContext db, HttpContext context) =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var run = await db.LeaderboardRuns.FindAsync(userId);
            if (run == null || run.RunId != runId) return Results.NotFound();
            if (run.Status == "Completed" && request.Kind == "finish")
                return Results.Ok(new { saved = true, run.ElapsedMilliseconds });
            if (run.Status != "Active") return Results.Conflict(new { message = "This run is no longer eligible." });
            if (DateTime.UtcNow - run.StartedAt > TimeSpan.FromHours(2))
                return Results.Conflict(new { message = "This run has expired." });
            switch (request.Kind)
            {
                case "delivery":
                    if (request.Completed != run.Deliveries + 1 || request.Completed > RequiredDeliveries)
                        return Results.BadRequest(new { message = "Delivery events must arrive once, in order." });
                    run.Deliveries = request.Completed;
                    break;
                case "fail": run.Status = "Failed"; break;
                case "finish":
                    if (run.Deliveries != RequiredDeliveries) return Results.BadRequest(new { message = "Complete every delivery to qualify." });
                    // Measure server wall time, not an editable client-provided score.
                    var elapsed = (long)(DateTime.UtcNow - run.StartedAt).TotalMilliseconds;
                    if (elapsed <= 0) return Results.BadRequest();
                    run.Status = "Completed"; run.ElapsedMilliseconds = elapsed;
                    var best = await db.LeaderboardBests.FindAsync(userId);
                    if (best == null) db.LeaderboardBests.Add(new LeaderboardBest { UserId = userId, ElapsedMilliseconds = elapsed, CompletedAt = DateTime.UtcNow });
                    else if (elapsed < best.ElapsedMilliseconds) { best.ElapsedMilliseconds = elapsed; best.CompletedAt = DateTime.UtcNow; }
                    break;
                default: return Results.BadRequest();
            }
            await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.Ok(new { saved = run.Status == "Completed", run.ElapsedMilliseconds });
        });
    }
    public record StartRequest(int TotalDeliveries);
    public record RunEvent(string? Kind, int Completed);
}
