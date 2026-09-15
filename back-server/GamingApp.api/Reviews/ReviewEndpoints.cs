using System.Security.Claims;
using GamingApp.api.Data;
using GamingApp.api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace GamingApp.api.Reviews;

public static class ReviewEndpoints
{
    public static void MapReviews(this WebApplication app)
    {
        // Separate from the protected Unity /games file paths: reviews are publicly readable.
        var reviews = app.MapGroup("/reviews/{gameId:int}");
        reviews.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            if (!HttpMethods.IsGet(context.HttpContext.Request.Method)
                && !await context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>().IsRequestValidAsync(context.HttpContext))
                return Results.BadRequest(new { message = "Refresh the page and try again." });
            return await next(context);
        });

        reviews.MapGet("", async (int gameId, int? page, AppDbContext db, HttpContext context) =>
        {
            if (!await db.Games.AnyAsync(g => g.Id == gameId)) return Results.NotFound();
            var number = Math.Clamp(page ?? 1, 1, 10000);
            var query = db.GameReviews.AsNoTracking().Where(r => r.GameId == gameId);
            var count = await query.CountAsync();
            var average = await query.Select(r => (double?)r.Rating).AverageAsync();
            var items = await query.OrderByDescending(r => r.Id).Skip((number - 1) * 10).Take(10).ToListAsync();
            var ids = items.Select(r => r.AuthorId).Distinct().ToArray();
            var names = await db.PlayerProfiles.Where(p => ids.Contains(p.UserId)).ToDictionaryAsync(p => p.UserId, p => p.DisplayName);
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var mine = userId == null ? null : await query.FirstOrDefaultAsync(r => r.AuthorId == userId);
            return Results.Ok(new { count, average, page = number,
                myReview = mine == null ? null : new { mine.Rating, mine.Body },
                items = items.Select(r => new { r.Id, r.Rating, r.Body, r.CreatedAt, r.UpdatedAt,
                    Author = names.GetValueOrDefault(r.AuthorId) ?? PlayerProfile.DefaultName(r.AuthorId) }) });
        });

        reviews.MapPut("/mine", async (int gameId, ReviewRequest request, AppDbContext db, HttpContext context) =>
        {
            if (request.Rating is < 1 or > 5 || string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 2000)
                return Results.BadRequest(new { message = "Choose 1–5 stars and write a review of up to 2,000 characters." });
            if (!await db.Games.AnyAsync(g => g.Id == gameId)) return Results.NotFound();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var review = await db.GameReviews.FirstOrDefaultAsync(r => r.GameId == gameId && r.AuthorId == userId);
            if (review == null)
            {
                review = new GameReview { GameId = gameId, AuthorId = userId };
                db.GameReviews.Add(review);
            }
            else review.UpdatedAt = DateTime.UtcNow;
            review.Rating = request.Rating;
            review.Body = request.Body.Trim();
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException error) when (error.InnerException is SqliteException { SqliteErrorCode: 19 })
            { return Results.Conflict(new { message = "The review changed while saving. Refresh and try again." }); }
            return Results.NoContent();
        }).RequireAuthorization();

        reviews.MapDelete("/mine", async (int gameId, AppDbContext db, HttpContext context) =>
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var review = await db.GameReviews.FirstOrDefaultAsync(r => r.GameId == gameId && r.AuthorId == userId);
            if (review == null) return Results.NotFound();
            db.GameReviews.Remove(review);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }

    public record ReviewRequest(int Rating, string? Body);
}
