using System.Security.Claims;
using GamingApp.api.Data;
using GamingApp.api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace GamingApp.api.Forum;

public static class ForumImprovements
{
    public static void MapForumImprovements(this RouteGroupBuilder forum)
    {
        forum.MapPut("/topics/{id:int}", async (int id, ForumEndpoints.NewTopic request, HttpContext context, AppDbContext db) =>
        {
            var topic = await db.ForumTopics.FindAsync(id);
            if (topic is null) return Results.NotFound();
            if (topic.AuthorId != context.User.FindFirstValue(ClaimTypes.NameIdentifier)) return Results.Forbid();
            if (request.Category is not ("Feedback" or "Ideas" or "Concerns") || string.IsNullOrWhiteSpace(request.Title)
                || request.Title.Trim().Length > 120 || string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 4000)
                return Results.BadRequest(new { message = "Choose a category, a title up to 120 characters, and a message up to 4,000 characters." });
            topic.Title = request.Title.Trim(); topic.Category = request.Category; topic.Body = request.Body.Trim(); topic.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();

        forum.MapPut("/replies/{id:int}", async (int id, ForumEndpoints.NewReply request, HttpContext context, AppDbContext db) =>
        {
            var reply = await db.ForumReplies.FindAsync(id);
            if (reply is null) return Results.NotFound();
            if (reply.AuthorId != context.User.FindFirstValue(ClaimTypes.NameIdentifier)) return Results.Forbid();
            if (string.IsNullOrWhiteSpace(request.Body) || request.Body.Trim().Length > 4000)
                return Results.BadRequest(new { message = "Enter a reply up to 4,000 characters." });
            reply.Body = request.Body.Trim(); reply.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();

        forum.MapPost("/reports", async (ReportRequest request, HttpContext context, AppDbContext db) =>
        {
            if (request.Kind is not ("topic" or "reply") || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1000)
                return Results.BadRequest(new { message = "Describe the concern in 1–1,000 characters." });
            ForumTopic? topic;
            string body;
            if (request.Kind == "topic")
            {
                topic = await db.ForumTopics.FindAsync(request.TargetId);
                if (topic is null) return Results.NotFound();
                body = topic.Body;
            }
            else
            {
                var reply = await db.ForumReplies.FindAsync(request.TargetId);
                if (reply is null) return Results.NotFound();
                topic = await db.ForumTopics.FindAsync(reply.ForumTopicId);
                if (topic is null) return Results.NotFound();
                body = reply.Body;
            }
            var reporter = context.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            if (await db.ForumReports.AnyAsync(r => r.ReporterId == reporter && r.Kind == request.Kind && r.TargetId == request.TargetId))
                return Results.Conflict(new { message = "You have already reported this post." });
            db.ForumReports.Add(new ForumReport { ReporterId = reporter, Kind = request.Kind, TargetId = request.TargetId,
                TopicId = topic.Id, Reason = request.Reason.Trim(), TitleSnapshot = topic.Title, BodySnapshot = body });
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateException error) when (error.InnerException is SqliteException { SqliteErrorCode: 19 })
            { return Results.Conflict(new { message = "You have already reported this post." }); }
            return Results.NoContent();
        }).RequireAuthorization();

        forum.MapGet("/reports", async (int? page, AppDbContext db) =>
        {
            var number = Math.Clamp(page ?? 1, 1, 10000);
            var query = db.ForumReports.AsNoTracking().Where(r => r.ResolvedAt == null);
            return Results.Ok(new { total = await query.CountAsync(), page = number,
                items = await query.OrderBy(r => r.Id).Skip((number - 1) * 20).Take(20)
                    .Select(r => new { r.Id, r.Kind, r.TopicId, r.TargetId, r.Reason, r.TitleSnapshot, r.BodySnapshot, r.CreatedAt }).ToListAsync() });
        }).RequireAuthorization("Owner");

        forum.MapPost("/reports/{id:int}/resolve", async (int id, ResolveRequest request, AppDbContext db) =>
        {
            if (request.Action is not ("dismiss" or "remove")) return Results.BadRequest();
            await using var transaction = await db.Database.BeginTransactionAsync();
            var report = await db.ForumReports.FindAsync(id);
            if (report is null) return Results.NotFound();
            if (report.ResolvedAt != null) return Results.Conflict(new { message = "This report has already been resolved." });
            if (request.Action == "remove")
            {
                if (report.Kind == "topic")
                {
                    var topic = await db.ForumTopics.FindAsync(report.TargetId);
                    if (topic != null) db.ForumTopics.Remove(topic);
                }
                else
                {
                    var reply = await db.ForumReplies.FindAsync(report.TargetId);
                    if (reply != null) db.ForumReplies.Remove(reply);
                }
            }
            report.ResolvedAt = DateTime.UtcNow; report.Resolution = request.Action;
            await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.NoContent();
        }).RequireAuthorization("Owner");
    }
    public record ReportRequest(string? Kind, int TargetId, string? Reason);
    public record ResolveRequest(string? Action);
}
