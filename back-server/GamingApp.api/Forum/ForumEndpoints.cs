using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using GamingApp.api.Data;
using GamingApp.api.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace GamingApp.api.Forum;

public static class ForumEndpoints
{
    // Public labels don't disclose players' login email addresses or account IDs.
    private static string Label(string id) => "Player " + Convert.ToHexString(
        SHA256.HashData(Encoding.UTF8.GetBytes(id)))[..8];

    public static void MapForum(this WebApplication app)
    {
        var forum = app.MapGroup("/forum");
        forum.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            if (!HttpMethods.IsGet(context.HttpContext.Request.Method))
            {
                var csrf = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
                if (!await csrf.IsRequestValidAsync(context.HttpContext))
                    return Results.BadRequest(new { message = "Refresh the page and try again." });
            }
            return await next(context);
        });

        forum.MapGet("/topics", async (int? page, AppDbContext db) =>
        {
            var number = Math.Clamp(page ?? 1, 1, 10000);
            var total = await db.ForumTopics.CountAsync();
            var topics = await db.ForumTopics.AsNoTracking().OrderByDescending(t => t.Id)
                .Skip((number - 1) * 20).Take(20)
                .Select(t => new { t.Id, t.Title, t.Category, t.AuthorId, t.CreatedAt, ReplyCount = t.Replies.Count })
                .ToListAsync();
            return Results.Ok(new { total, page = number, items = topics.Select(t => new
                { t.Id, t.Title, t.Category, Author = Label(t.AuthorId), t.CreatedAt, t.ReplyCount }) });
        });

        forum.MapGet("/topics/{id:int}", async (int id, int? page, HttpContext context, AppDbContext db, IConfiguration config) =>
        {
            var topic = await db.ForumTopics.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (topic is null) return Results.NotFound();
            var number = Math.Clamp(page ?? 1, 1, 10000);
            var replies = await db.ForumReplies.AsNoTracking().Where(r => r.ForumTopicId == id)
                .OrderBy(r => r.Id).Skip((number - 1) * 20).Take(20).ToListAsync();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Results.Ok(new { topic.Id, topic.Title, topic.Category, topic.Body, topic.CreatedAt,
                Author = Label(topic.AuthorId),
                CanDelete = userId != null && (userId == topic.AuthorId || userId == config["Owner:UserId"]),
                total = await db.ForumReplies.CountAsync(r => r.ForumTopicId == id), page = number,
                replies = replies.Select(r => new { r.Id, r.Body, r.CreatedAt, Author = Label(r.AuthorId) }) });
        });

        forum.MapPost("/topics", async (NewTopic request, HttpContext context, AppDbContext db) =>
        {
            if (request.Category is not ("Feedback" or "Ideas" or "Concerns")
                || string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 120
                || string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 4000)
                return Results.BadRequest(new { message = "Choose a category, a title up to 120 characters, and a message up to 4,000 characters." });
            var topic = new ForumTopic { Title = request.Title.Trim(), Body = request.Body.Trim(),
                Category = request.Category, AuthorId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)! };
            db.ForumTopics.Add(topic);
            await db.SaveChangesAsync();
            return Results.Created($"/forum/topics/{topic.Id}", new { topic.Id });
        }).RequireAuthorization();

        forum.MapPost("/topics/{id:int}/replies", async (int id, NewReply request, HttpContext context, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 4000)
                return Results.BadRequest(new { message = "Enter a reply up to 4,000 characters." });
            if (!await db.ForumTopics.AnyAsync(t => t.Id == id)) return Results.NotFound();
            var reply = new ForumReply { ForumTopicId = id, Body = request.Body.Trim(),
                AuthorId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)! };
            db.ForumReplies.Add(reply);
            await db.SaveChangesAsync();
            return Results.Ok(new { reply.Id });
        }).RequireAuthorization();

        forum.MapDelete("/topics/{id:int}", async (int id, HttpContext context, AppDbContext db, IConfiguration config) =>
        {
            var topic = await db.ForumTopics.FindAsync(id);
            if (topic is null) return Results.NotFound();
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != topic.AuthorId && userId != config["Owner:UserId"]) return Results.Forbid();
            db.ForumTopics.Remove(topic);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }

    public record NewTopic(string? Title, string? Category, string? Body);
    public record NewReply(string? Body);
}
