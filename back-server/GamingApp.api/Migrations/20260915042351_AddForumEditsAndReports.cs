using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingApp.api.Migrations
{
    /// <inheritdoc />
    public partial class AddForumEditsAndReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ForumTopics",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ForumReplies",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ForumReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ReporterId = table.Column<string>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<int>(type: "INTEGER", nullable: false),
                    TopicId = table.Column<int>(type: "INTEGER", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    TitleSnapshot = table.Column<string>(type: "TEXT", nullable: false),
                    BodySnapshot = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Resolution = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ForumReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ForumReports_AspNetUsers_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ForumReports_ReporterId_Kind_TargetId",
                table: "ForumReports",
                columns: new[] { "ReporterId", "Kind", "TargetId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ForumReports");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ForumTopics");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ForumReplies");
        }
    }
}
